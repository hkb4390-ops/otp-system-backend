import asyncio

# Python 3.14 Event Loop Fix
try:
    asyncio.get_event_loop()
except RuntimeError:
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)

import os
import urllib.parse
from hydrogram import Client, filters
from hydrogram.types import InlineKeyboardMarkup, InlineKeyboardButton, WebAppInfo

API_ID = int(os.environ.get("API_ID", "34305725"))
API_HASH = os.environ.get("API_HASH", "a7439c105c050b5011a90bda4f0e1e90")
BOT_TOKEN = os.environ.get("BOT_TOKEN", "8929869494:AAEhXBEO-b23LeEXtMhbDWlBNmYFaYr-Luw")

MINI_APP_URL = "https://hrryimgpost-y7qp.vercel.app/" 

app = Client("premium_bot", api_id=API_ID, api_hash=API_HASH, bot_token=BOT_TOKEN)

@app.on_message(filters.command("start") & filters.private)
async def start_command(client, message):
    user = message.from_user
    name = user.first_name if user.first_name else "User"
    user_id = user.id
    
    wa_message = f"Hello! Mera naam {name} hai aur meri TG User ID {user_id} hai. Mujhe Bot ki Premium Key kharidni hai."
    wa_url = f"https://wa.me/9199015259?text={urllib.parse.quote(wa_message)}"
    
    welcome_text = (
        f"👑 **Welcome to the Premium Dashboard, {name}!** 👑\n\n"
        "🚀 Open App par click karke aap humara Mini App use kar sakte hain.\n\n"
        "🔑 **Premium Key Price: ₹20 Only**\n"
        "💡 *Note: Premium Key kharidne ke liye 'Buy Key' par click karein aur WhatsApp par message bhejein.*\n\n"
        "👇 Niche diye gaye buttons se choose karein:"
    )
    
    buttons = InlineKeyboardMarkup(
        [
            [
                InlineKeyboardButton("🟢 Open App", web_app=WebAppInfo(url=MINI_APP_URL))
            ],
            [
                InlineKeyboardButton("🔴 Buy Key (₹20)", url=wa_url)
            ]
        ]
    )
    
    sent_message = await message.reply_text(
        text=welcome_text, 
        reply_markup=buttons,
        quote=True
    )
    
    try:
        await sent_message.pin(both_sides=True)
    except Exception as e:
        print(f"Pin karne me error: {e}")

print("Bot Successfully Start Ho Gaya Hai!")

if __name__ == "__main__":
    app.run()
