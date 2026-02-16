import logging
import json
import time
import google.generativeai as genai
from google.generativeai.types import HarmCategory, HarmBlockThreshold
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type
from typing import Dict, Any

from ..models import RaceState, AIEnvironmentResponse, RivalAction

logger = logging.getLogger("roadrash_backend")

class GeminiService:
    def __init__(self, api_key: str):
        if not api_key:
            logger.warning("Gemini API Key is missing. Service will fail on requests.")
        
        self.api_key = api_key
        genai.configure(api_key=self.api_key)
        
        # Using the model specified in the system guidelines
        self.model_name = "gemini-3-flash-preview" 
        
        self.model = genai.GenerativeModel(
            model_name=self.model_name,
            system_instruction=(
                "You are the Game Master AI for 'Road Rash: Neon Vengeance'. "
                "Your goal is to analyze the race state and generate a dynamic, "
                "high-octane response that controls rival behavior and game commentary. "
                "Keep commentary short, punchy, and aggressive. "
                "Adjust difficulty dynamically based on player performance."
            )
        )

        # Define the JSON Schema for strict validation
        self.response_schema = {
            "type": "object",
            "properties": {
                "rival_actions": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "rival_id": {"type": "string"},
                            "action": {"type": "string", "enum": ["swerve", "attack", "accelerate", "brake", "taunt"]},
                            "target_x": {"type": "number"},
                            "dialogue": {"type": "string"}
                        },
                        "required": ["rival_id", "action"]
                    }
                },
                "commentary": {"type": "string"},
                "environment_effect": {"type": "string"},
                "dynamic_difficulty_adjustment": {"type": "number"}
            },
            "required": ["rival_actions", "dynamic_difficulty_adjustment"]
        }

    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=2, max=10),
        retry_error_callback=lambda state: logger.error(f"Gemini Retry Failed: {state.outcome.exception()}")
    )
    async def analyze_race_state(self, state: RaceState) -> AIEnvironmentResponse:
        """
        Analyzes the race state using Gemini with strict JSON validation and retries.
        """
        start_time = time.time()
        
        try:
            # 1. Construct Prompt
            prompt_content = f"""
            Current Race State:
            - Player Health: {state.player_stats.health}%
            - Speed: {state.player_stats.speed} mph
            - Score: {state.player_stats.score}
            - Active Rivals: {state.active_rivals_count}
            - Game Status: {state.status.value}
            
            Generate a JSON response reacting to this state. 
            If health is low, make rivals aggressive. 
            If speed is high, increase difficulty.
            """

            # 2. Call Gemini API
            response = self.model.generate_content(
                prompt_content,
                generation_config=genai.GenerationConfig(
                    response_mime_type="application/json",
                    response_schema=self.response_schema,
                    temperature=0.7,
                    max_output_tokens=500,
                ),
                safety_settings={
                    HarmCategory.HARM_CATEGORY_HARASSMENT: HarmBlockThreshold.BLOCK_NONE,
                    HarmCategory.HARM_CATEGORY_HATE_SPEECH: HarmBlockThreshold.BLOCK_NONE,
                    HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT: HarmBlockThreshold.BLOCK_NONE,
                    HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT: HarmBlockThreshold.BLOCK_NONE,
                }
            )

            # 3. Telemetry / Token Usage Logging
            usage = response.usage_metadata
            if usage:
                logger.info(
                    f"Gemini Token Usage - Input: {usage.prompt_token_count}, "
                    f"Output: {usage.candidates_token_count}, "
                    f"Total: {usage.total_token_count}"
                )

            # 4. Parse & Validate
            # response.text should be a valid JSON string enforcing the schema
            raw_json = json.loads(response.text)
            
            # Sanitize and Validate via Pydantic
            # This ensures extra fields are ignored and types are correct
            validated_response = AIEnvironmentResponse(**raw_json)

            process_time = time.time() - start_time
            logger.info(f"Gemini analysis completed in {process_time:.3f}s")
            
            return validated_response

        except json.JSONDecodeError as e:
            logger.error(f"Failed to decode Gemini JSON response: {e}")
            # Fallback for JSON errors
            return self._get_fallback_response()
            
        except Exception as e:
            logger.error(f"Gemini Service Exception: {str(e)}")
            raise e # Trigger Tenacity retry

    def _get_fallback_response(self) -> AIEnvironmentResponse:
        """Safe fallback in case of total AI failure"""
        return AIEnvironmentResponse(
            rival_actions=[],
            commentary="Connection lost... Racing offline.",
            environment_effect="Static",
            dynamic_difficulty_adjustment=1.0
        )
