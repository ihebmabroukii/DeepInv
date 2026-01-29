import aiofiles
import json
import asyncio
from typing import AsyncGenerator, Dict, Any
from app.core.config import settings
from loguru import logger
import os

class WazuhReader:
    def __init__(self):
        self.file_path = settings.WAZUH_LOG_PATH
        
    async def tail_logs(self) -> AsyncGenerator[Dict[str, Any], None]:
        """
        Continuously yields new JSON objects from the Wazuh alerts.json log file.
        """
        if not os.path.exists(self.file_path):
            logger.warning(f"Wazuh log file not found at {self.file_path}. Waiting for it to appear...")
            # Ideally we check existence in a loop, but let's wait a bit
            while not os.path.exists(self.file_path):
                await asyncio.sleep(5)
        
        logger.info(f"Tailing Wazuh logs at {self.file_path}")
        
        async with aiofiles.open(self.file_path, mode='r') as f:
            # Move pointer to end of file to read only NEW alerts
            await f.seek(0, 2)
            
            while True:
                line = await f.readline()
                if not line:
                    await asyncio.sleep(0.5) 
                    continue
                
                try:
                    data = json.loads(line)
                    # Filter: Only ingest alerts with Level >= 3 (default) or configurable
                    # Wazuh alerts.json contains all alerts.
                    yield data
                except json.JSONDecodeError:
                    continue
