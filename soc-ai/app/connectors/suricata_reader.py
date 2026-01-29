import aiofiles
import json
import asyncio
from typing import AsyncGenerator, Dict, Any
from app.core.config import settings
from loguru import logger
import os

class SuricataReader:
    def __init__(self):
        self.file_path = settings.SURICATA_LOG_PATH
        
    async def tail_logs(self) -> AsyncGenerator[Dict[str, Any], None]:
        """
        Continuously yields new JSON objects from the Suricata eve.json log file.
        Simulates 'tail -f'.
        """
        if not os.path.exists(self.file_path):
            logger.warning(f"Suricata log file not found at {self.file_path}. Waiting for it to appear...")
            while not os.path.exists(self.file_path):
                await asyncio.sleep(5)
        
        logger.info(f"Tailing Suricata logs at {self.file_path}")
        
        async with aiofiles.open(self.file_path, mode='r') as f:
            # Move pointer to end of file to read only NEW alerts
            await f.seek(0, 2)
            
            while True:
                line = await f.readline()
                if not line:
                    await asyncio.sleep(0.1) # efficient wait
                    continue
                
                try:
                    data = json.loads(line)
                    # Filter only alerts? Suricata logs stats/DNS/HTTP too.
                    if data.get('event_type') == 'alert':
                        yield data
                except json.JSONDecodeError:
                    logger.warning("Failed to parse Suricata log line as JSON")
                    continue
