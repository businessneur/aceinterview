"""
LiveKit Voice Agent: Joins a LiveKit room as an AI agent and converses using LLM and TTS.
Docs: https://docs.livekit.io/agents/start/voice-ai/
"""

import os
from dotenv import load_dotenv
import json


# Suppress INFO logs from livekit.agents
import logging
logging.getLogger("livekit.agents").setLevel(logging.DEBUG)

from livekit import agents
from livekit.agents import Agent, AgentSession, WorkerOptions

# Import plugins from their specific packages
#  Adding English Turn detector model
try:
    from livekit.plugins.turn_detector.multilingual import MultilingualModel
    MULTILINGUAL_MODEL_AVAILABLE = True
    print("MultilingualModel imported successfully")
except ImportError as e:
    print(f"livekit-plugins-turn-detector not installed or MultilingualModel not available: {e}")
    print("Will fall back to VAD for turn detection. Install with: pip install livekit-plugins-turn-detector")
    MULTILINGUAL_MODEL_AVAILABLE = False
    MultilingualModel = None

try:
    from livekit.plugins import google
except ImportError:
    print("livekit-plugins not installed. Install with: pip install livekit-plugins-google")
    exit(1)

try:
    from livekit.plugins import elevenlabs
except ImportError:
    print("livekit-plugins-elevenlabs not installed. Install with: pip install livekit-plugins-elevenlabs")
    exit(1)

try:
    from livekit.plugins.gladia import STT as GladiaSTT
except ImportError:
    print("livekit-plugins-gladia not installed. Install with: pip install livekit-plugins-gladia")
    exit(1)

try:
    from livekit.plugins import silero
except ImportError:
    print("livekit-plugins-silero not installed. Install with: pip install livekit-plugins-silero")
    exit(1)

load_dotenv()

class Assistant(Agent):
    def __init__(self, ctx: agents.JobContext, user_context: dict = None) -> None:
        self.ctx = ctx
        self.user_context = user_context or {}
        tech = self.user_context.get("interview_technology")
        company = self.user_context.get("interview_company")
        experience = self.user_context.get("interview_experience")
        instructions = (
            "You are an expert interviewer who simulates a real interview environment to help users prepare for job interviews."
        )
        if tech or company or experience:
            instructions += (
                f" The user is preparing for a {tech or ''} interview at {company or 'a company'} with experience level {experience or 'unspecified'}."
                " Ask relevant interview questions. After each answer, ask a follow-up if appropriate, then continue with the next."
            )
        super().__init__(instructions=instructions)
        try:
            self.duration_minutes = float(self.user_context.get("interview_duration", 10))
        except Exception:
            self.duration_minutes = 10

    async def on_enter(self):
        print("Assistant entered the room, generating initial reply...")
        await self.session.generate_reply()
        
    async def on_user_speech_committed(self, user_msg):
        print(f"User speech committed: {user_msg.content}")
        await super().on_user_speech_committed(user_msg)
    
    async def on_turn_start(self):
        print("🎯 Turn start detected!")
        await super().on_turn_start()
    
    async def on_turn_end(self):
        print("🛑 Turn end detected!")
        await super().on_turn_end()

async def entrypoint(ctx: agents.JobContext):
    user_context = {}
    if ctx.job.metadata:
        try:
            user_context = json.loads(ctx.job.metadata)
        except json.JSONDecodeError:
            print("Warning: ctx.job.metadata is not valid JSON. Using empty user_context.")

    # Configure turn detection with proper fallback and debugging
    turn_detector = None
    print(f"MULTILINGUAL_MODEL_AVAILABLE: {MULTILINGUAL_MODEL_AVAILABLE}")
    
    if MULTILINGUAL_MODEL_AVAILABLE and MultilingualModel:
        try:
            print("Attempting to initialize MultilingualModel...")
            # Create MultilingualModel with explicit configuration
            turn_detector = MultilingualModel()
            print(f"✓ Successfully initialized MultilingualModel: {type(turn_detector)}")
        except RuntimeError as e:
            print(f"✗ RuntimeError initializing MultilingualModel: {e}")
            if "Could not find model" in str(e) or "No such file" in str(e) or "initialization failed" in str(e):
                print("Turn detector model files not found or initialization failed.")
                print("This is expected in Docker environments without pre-downloaded models.")
                print("Falling back to VAD for turn detection (this is perfectly fine for most use cases)")
            else:
                print(f"Other RuntimeError: {e}, falling back to VAD")
            turn_detector = None
        except Exception as e:
            print(f"✗ Unexpected error initializing MultilingualModel: {e}, falling back to VAD")
            turn_detector = None
    else:
        print("MultilingualModel not available, using VAD for turn detection")
    
    # Fallback to VAD if turn_detector is None
    if turn_detector is None:
        print("Using 'vad' string for turn detection")
        turn_detector = "vad"

    print(f"Configuring session with turn_detection: {turn_detector} (type: {type(turn_detector)})")
    
    # Configure VAD with more sensitive settings for better turn detection
    try:
        vad_instance = silero.VAD.load(
            min_silence_duration=0.5,  # Shorter silence detection
            min_speech_duration=0.1,   # Shorter speech detection  
            speech_threshold=0.3,      # Lower threshold for speech detection
        )
        print(f"✓ Successfully loaded Silero VAD with sensitive settings: {type(vad_instance)}")
    except Exception as e:
        print(f"✗ Failed to load Silero VAD with custom settings: {e}")
        try:
            # Fallback to default VAD configuration
            vad_instance = silero.VAD.load()
            print(f"✓ Successfully loaded default Silero VAD: {type(vad_instance)}")
        except Exception as e2:
            print(f"✗ Failed to load even default Silero VAD: {e2}")
            # This should not happen, but just in case
            vad_instance = "vad"
    
    if isinstance(turn_detector, str) and turn_detector == "vad":
        # Use VAD-based turn detection (no explicit turn_detection parameter)
        print("Using VAD-based turn detection with explicit configuration")
        session = AgentSession(
            stt=GladiaSTT(),
            llm=google.LLM(model="gemini-2.0-flash-exp", temperature=0.8),
            tts=elevenlabs.TTS(voice_id="Xb7hH8MSUJpSbSDYk0k2", model="eleven_multilingual_v2"),
            vad=vad_instance,
            # Don't specify turn_detection when using VAD, let it use default VAD-based detection
        )
    else:
        # Use the multilingual model for turn detection
        print("Using MultilingualModel for turn detection")
        session = AgentSession(
            stt=GladiaSTT(),
            llm=google.LLM(model="gemini-2.0-flash-exp", temperature=0.8),
            tts=elevenlabs.TTS(voice_id="Xb7hH8MSUJpSbSDYk0k2", model="eleven_multilingual_v2"),
            vad=vad_instance,
            turn_detection=turn_detector,
        )
    
    print(f"✓ Session configured successfully")
    print(f"  - STT: {type(session.stt)}")
    print(f"  - LLM: {type(session.llm)}")
    print(f"  - TTS: {type(session.tts)}")
    print(f"  - VAD: {type(session.vad)}")
    print(f"  - Turn Detection: {type(session.turn_detection) if hasattr(session, 'turn_detection') else 'Not available'}")
    print("Starting agent session...")

    await session.start(
        room=ctx.room,
        agent=Assistant(ctx=ctx, user_context=user_context),
    )
    await ctx.connect()


if __name__ == "__main__":
    
    agents.cli.run_app(
        WorkerOptions(
            entrypoint_fnc=entrypoint,
            agent_name=os.environ.get("LIVEKIT_AGENT_ID", "voice-agent"),  # <-- add this line
            ws_url=os.environ.get("LIVEKIT_WS_URL"),
            api_key=os.environ["LIVEKIT_API_KEY"],
            api_secret=os.environ["LIVEKIT_API_SECRET"],
        )
    )

