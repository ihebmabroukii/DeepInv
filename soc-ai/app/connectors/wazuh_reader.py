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

        first_open = True
        while True:
            try:
                async with aiofiles.open(self.file_path, mode='r') as f:
                    # First open: jump to the end so we only read NEW alerts.
                    # After a rotation: read the fresh file from the start so we
                    # don't miss alerts written to the newly-created file.
                    await f.seek(0, 2 if first_open else 0)
                    first_open = False
                    inode = os.stat(self.file_path).st_ino

                    while True:
                        line = await f.readline()
                        if line:
                            try:
                                yield json.loads(line)
                            except json.JSONDecodeError:
                                pass
                            continue

                        # No new data: idle briefly, then check for rotation/truncation.
                        await asyncio.sleep(0.5)
                        try:
                            st = os.stat(self.file_path)
                            if st.st_ino != inode or st.st_size < await f.tell():
                                logger.info("Wazuh alerts.json rotated/truncated — reopening")
                                break
                        except FileNotFoundError:
                            logger.warning("Wazuh alerts.json missing — waiting to reappear")
                            await asyncio.sleep(3)
                            break
            except Exception as e:
                logger.error(f"Wazuh tail error: {e}; retrying in 3s")
                await asyncio.sleep(3)
