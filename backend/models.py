from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional, Dict, Any
from enum import Enum
from datetime import datetime

class GameStatus(str, Enum):
    MENU = "MENU"
    RACING = "RACING"
    GAME_OVER = "GAME_OVER"
    VICTORY = "VICTORY"

class UserRole(str, Enum):
    RIDER = "RIDER"
    ADMIN = "ADMIN"

class UserProfile(BaseModel):
    user_id: str
    username: str
    email: Optional[EmailStr] = None
    role: UserRole = UserRole.RIDER
    total_races: int = 0
    total_wins: int = 0
    total_score: int = 0
    reputation: int = 0
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class RaceHistoryEntry(BaseModel):
    race_id: str
    user_id: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    score: int
    duration_seconds: float
    result: GameStatus
    max_speed_reached: float
    rivals_defeated: int

class PlayerStats(BaseModel):
    health: float = Field(..., ge=0, le=100)
    score: int = Field(..., ge=0)
    speed: float = Field(..., ge=0)
    distance: float = Field(..., ge=0)

class RivalAction(BaseModel):
    rival_id: str
    action: str = Field(..., description="Action taken by rival: swerve, attack, accelerate")
    target_x: Optional[float] = None
    dialogue: Optional[str] = None

class AIEnvironmentResponse(BaseModel):
    rival_actions: List[RivalAction]
    commentary: Optional[str] = None
    environment_effect: Optional[str] = None
    dynamic_difficulty_adjustment: float = 1.0

class RaceState(BaseModel):
    race_id: str
    user_id: Optional[str] = "guest"
    status: GameStatus
    player_stats: PlayerStats
    timestamp: float = Field(default_factory=lambda: datetime.now().timestamp())
    active_rivals_count: int
