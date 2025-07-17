"""
LiveKit Voice Agent: Joins a LiveKit room as an AI agent and converses using LLM and TTS.
Docs: https://docs.livekit.io/agents/start/voice-ai/
"""

import os
from dotenv import load_dotenv
import json
import time


# Suppress INFO logs from livekit.agents
import logging
logger = logging.getLogger("livekit.agents").setLevel(logging.INFO)

from livekit import agents
from livekit.agents import Agent, AgentSession, WorkerOptions, AutoSubscribe,JobContext


# Import plugins from their specific packages
try:
    from livekit.plugins.turn_detector.english import EnglishModel
    print("English Model imported successfully")
except ImportError as e:
    print(f"livekit-plugins-turn-detector not installed or English not available: {e}")
    print("Will fall back to VAD for turn detection. Install with: pip install livekit-plugins-turn-detector")

# Import plugins from their specific packages
try:
    from livekit.plugins.turn_detector.multilingual import MultilingualModel
    print("Multilingual Model imported successfully")
except ImportError as e:
    print(f"livekit-plugins-turn-detector not installed or MultilingualModel not available: {e}")
    print("Will fall back to VAD for turn detection. Install with: pip install livekit-plugins-turn-detector")

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
    def __init__(self, ctx: agents.JobContext, user_context: dict = {}) -> None:
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
                " Ask relevant interview questions. After each answer, ask a quick follow-up if appropriate, then continue with the next question for the interview."
            )
        super().__init__(instructions=instructions)
        try:
            self.duration_minutes = float(self.user_context.get("interview_duration", 10))
        except Exception:
            self.duration_minutes = 10

    async def on_enter(self):
        await self.session.generate_reply()
        self.start_time = time.monotonic()

    async def on_user_message(self, message):
        """
        Called when the user sends a message/answer.
        Checks if the interview duration has elapsed and ends the session if needed.
        """
        # Check if duration is set and time has elapsed
        if self.duration_minutes and self.start_time:
            elapsed = (time.monotonic() - self.start_time) / 60
            if elapsed >= self.duration_minutes:
                await self.session.generate_reply(
                    instructions="Thank you for your answer. The interview duration has ended best of luck for your interview!"
                )
                self.ctx.shutdown()
                return
        # Process the user's message
        await self.session.generate_reply()
            
    async def connect(self, ctx: JobContext):    
        await ctx.connect(auto_subscribe=AutoSubscribe.SUBSCRIBE_ALL)        

#def prewarm_fnc(proc: agents.JobProcess):
    # load silero weights and store to process userdata
    #proc.userdata["vad"] = silero.VAD.load()

async def entrypoint(ctx: agents.JobContext):
    user_context = {}
    if ctx.job.metadata:
        try:
            user_context = json.loads(ctx.job.metadata)
        except json.JSONDecodeError:
            print("Warning: ctx.job.metadata is not valid JSON. Using empty user_context.")

    #vad: silero.VAD = ctx.proc.userdata["vad"]

    session = AgentSession(
        stt=GladiaSTT(),
        #llm=openai.LLM(model="gpt-4o-mini"),
        #tts=CartesiaTTS(model="sonic-2", voice="f786b574-daa5-4673-aa0c-cbe3e8534c02"),
        llm=google.LLM(model="gemini-2.0-flash-exp", temperature=0.8),
        tts=elevenlabs.TTS(voice_id="Xb7hH8MSUJpSbSDYk0k2", model="eleven_multilingual_v2"),
        #turn_detection="stt",#EnglishModel(),
        vad=silero.VAD.load(),
        #vad=vad, #silero.VAD.load(),
        #turn_detection=EnglishModel()#"vad"    #MultilingualModel(),  #EnglishModel() Use VAD for turn detection
        turn_detection=MultilingualModel(),
    )

    await session.start(
        room=ctx.room,
        agent=Assistant(ctx=ctx, user_context=user_context),
    )
    
    await ctx.connect(auto_subscribe=AutoSubscribe.SUBSCRIBE_ALL)

if __name__ == "__main__":
    agents.cli.run_app(
        WorkerOptions(
            entrypoint_fnc=entrypoint,
            #prewarm_fnc=prewarm_fnc,
            agent_name=os.environ.get("LIVEKIT_AGENT_ID", "voice-agent"), 
            ws_url=os.environ["LIVEKIT_WS_URL"],
            api_key=os.environ["LIVEKIT_API_KEY"],
            api_secret=os.environ["LIVEKIT_API_SECRET"],
        )
    )

