import logging
import os
import asyncio
from functools import partial
from typing import Dict, Any, Optional

import firebase_admin
from firebase_admin import credentials, firestore
from google.cloud.firestore_v1.base_query import FieldFilter

logger = logging.getLogger("roadrash_backend")

class FirestoreService:
    def __init__(self, creds_path: str):
        self.creds_path = creds_path
        self.db = None
        self._initialize_app()

    def _initialize_app(self):
        """Initializes the Firebase Admin SDK synchronously."""
        try:
            if not firebase_admin._apps:
                if self.creds_path and os.path.exists(self.creds_path):
                    logger.info(f"Loading Firebase creds from {self.creds_path}")
                    cred = credentials.Certificate(self.creds_path)
                    firebase_admin.initialize_app(cred)
                else:
                    logger.warning("No credentials file found. Attempting to use Application Default Credentials.")
                    firebase_admin.initialize_app()
            
            self.db = firestore.client()
            logger.info("FirestoreService initialized successfully.")
        except Exception as e:
            logger.error(f"Failed to initialize Firestore: {e}")
            # In a real app, we might raise e here to prevent startup if DB is critical
            # raise e

    async def _run_in_executor(self, func, *args):
        """Helper to run blocking Firestore calls in a thread pool."""
        loop = asyncio.get_running_loop()
        return await loop.run_in_executor(None, partial(func, *args))

    # --- User Profile Management ---

    def _create_or_update_user_sync(self, user_id: str, data: Dict[str, Any]) -> bool:
        if not self.db: return False
        try:
            # Set with merge=True acts as upsert
            data['updated_at'] = firestore.SERVER_TIMESTAMP
            self.db.collection('users').document(user_id).set(data, merge=True)
            return True
        except Exception as e:
            logger.error(f"Firestore create_user error: {e}")
            return False

    async def create_or_update_user(self, user_id: str, data: Dict[str, Any]) -> bool:
        return await self._run_in_executor(self._create_or_update_user_sync, user_id, data)

    def _get_user_profile_sync(self, user_id: str) -> Optional[Dict[str, Any]]:
        if not self.db: return None
        try:
            doc = self.db.collection('users').document(user_id).get()
            if doc.exists:
                return doc.to_dict()
            return None
        except Exception as e:
            logger.error(f"Firestore get_user error: {e}")
            return None

    async def get_user_profile(self, user_id: str) -> Optional[Dict[str, Any]]:
        return await self._run_in_executor(self._get_user_profile_sync, user_id)

    # --- Race History & Progression ---

    def _update_player_progression_sync(self, user_id: str, score: int, is_win: bool) -> bool:
        if not self.db: return False
        try:
            user_ref = self.db.collection('users').document(user_id)
            
            updates = {
                'total_score': firestore.Increment(score),
                'total_races': firestore.Increment(1),
                'updated_at': firestore.SERVER_TIMESTAMP
            }
            if is_win:
                updates['total_wins'] = firestore.Increment(1)
                updates['reputation'] = firestore.Increment(100)
            else:
                 updates['reputation'] = firestore.Increment(10)

            user_ref.update(updates)
            return True
        except Exception as e:
            logger.error(f"Firestore update_progression error: {e}")
            return False

    async def update_player_progression(self, user_id: str, score: int, is_win: bool) -> bool:
        return await self._run_in_executor(self._update_player_progression_sync, user_id, score, is_win)

    def _save_race_history_sync(self, race_id: str, data: Dict[str, Any]) -> bool:
        if not self.db: return False
        try:
            self.db.collection('race_history').document(race_id).set(data)
            return True
        except Exception as e:
            logger.error(f"Firestore save_history error: {e}")
            return False

    async def save_race_history(self, race_id: str, data: Dict[str, Any]) -> bool:
        return await self._run_in_executor(self._save_race_history_sync, race_id, data)

    # --- Generic State (Legacy/Telemetry) ---

    def _save_state_sync(self, collection: str, doc_id: str, data: Dict[str, Any]) -> bool:
        if not self.db: return False
        try:
            self.db.collection(collection).document(doc_id).set(data, merge=True)
            return True
        except Exception as e:
            logger.error(f"Firestore save_state error: {e}")
            return False

    async def save_state(self, collection: str, doc_id: str, data: Dict[str, Any]) -> bool:
        return await self._run_in_executor(self._save_state_sync, collection, doc_id, data)
