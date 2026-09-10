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
from hydrogram.types import InlineKeyboardMarkup, InlineKeyboardButton, WebAppInfo, CallbackQuery
from hydrogram.enums import ChatMemberStatus

API_ID = int(os.environ.get("API_ID", "34305725"))
API_HASH = os.environ.get("API_HASH", "a7439c105c050b5011a90bda4f0e1e90")
BOT_TOKEN = os.environ.get("BOT_TOKEN", "8929869494:AAEhXBEO-b23LeEXtMhbDWlBNmYFaYr-Luw")

# Updated Mini App URL & Channel Username
MINI_APP_URL = "https://hrryimgpost-y7qp.vercel.app/"
CHANNEL_USERNAME = "hrbseb10thallcorse"

app = Client("premium_bot", api_id=API_ID, api_hash=API_HASH, bot_token=BOT_TOKEN)

async def check_user_joined(client: Client, user_id: int) -> bool:
    """Live check if user is a member/admin of the channel"""
    try:
        member = await client.get_chat_member(f"@{CHANNEL_USERNAME}", user_id)
        if member.status in [ChatMemberStatus.MEMBER, ChatMemberStatus.ADMINISTRATOR, ChatMemberStatus.OWNER]:
            return True
    except Exception as e:
        print(f"Force Sub Check Error: {e}")
        return False
    return False

def get_welcome_menu(name: str, username: str, user_id: int):
    wa_message = f"Hello! Mera naam {name} hai aur meri TG User ID {user_id} hai. Mujhe Bot ki Premium Key kharidni hai."
    wa_url = f"https://wa.me/9199015259?text={urllib.parse.quote(wa_message)}"
    
    user_handle = f"@{username}" if username else "N/A"
    
    welcome_text = (
        "⚡ **──────────────────────────────**\n"
        "👑 **WELCOME TO PREMIUM DASHBOARD** 👑\n"
        "⚡ **──────────────────────────────**\n\n"
        "👤 **USER PROFILE DETAILS:**\n"
        f"├ 📛 **NAME:** `{name}`\n"
        f"├ 🆔 **USER ID:** `{user_id}`\n"
        f"└ 🌐 **USERNAME:** {user_handle}\n\n"
        "🚀 **STATUS: VERIFIED & ACTIVE** ✅\n"
        "Aapka account successfully verify ho chuka hai. Niche diye gaye button se Mini App access karein.\n\n"
        "🔑 **PREMIUM KEY INFORMATION:**\n"
        "├ 💸 **PRICE:** `₹20 ONLY`\n"
        "└ 💡 **NOTE:** Premium Key kharidne ke liye 'Buy Key' button par click karke WhatsApp support se contact karein.\n\n"
        "👇 **NICHE DIYE GAYE BUTTONS SE CHOOSE KAREIN:**"
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
    return welcome_text, buttons

def get_force_sub_menu():
    text = (
        "⛔ **ACCESS RESTRICTED! / ACCESS DENIED** ⛔\n\n"
        "⚠️ **Aapne humara official channel join nahi kiya hai.**\n"
        "Mini App aur Bot ke premium features use karne ke liye channel join karna zaroori hai.\n\n"
        "📢 **REQUIRED CHANNEL:** @hrbseb10thallcorse\n\n"
        "📌 **Steps to Unlock:**\n"
        "1️⃣ Niche **'📢 Join Channel'** button par click karke channel join karein.\n"
        "2️⃣ Join karne ke baad **'🔄 Verify / Check Again'** par click karein."
    )
    buttons = InlineKeyboardMarkup(
        [
            [
                InlineKeyboardButton("📢 Join Channel", url=f"https://t.me/{CHANNEL_USERNAME}")
            ],
            [
                InlineKeyboardButton("🔄 Verify / Check Again", callback_data="check_subscription")
            ]
        ]
    )
    return text, buttons

@app.on_message(filters.command("start") & filters.private)
async def start_command(client, message):
    user = message.from_user
    name = user.first_name if user.first_name else "User"
    username = user.username if user.username else ""
    user_id = user.id

    is_joined = await check_user_joined(client, user_id)
    
    if not is_joined:
        text, buttons = get_force_sub_menu()
        await message.reply_text(text=text, reply_markup=buttons, quote=True)
        return

    text, buttons = get_welcome_menu(name, username, user_id)
    sent_message = await message.reply_text(text=text, reply_markup=buttons, quote=True)
    
    try:
        await sent_message.pin(both_sides=True)
    except Exception as e:
        print(f"Pin karne me error: {e}")

@app.on_callback_query(filters.regex("^check_subscription$"))
async def check_subscription_callback(client, callback_query: CallbackQuery):
    user = callback_query.from_user
    name = user.first_name if user.first_name else "User"
    username = user.username if user.username else ""
    user_id = user.id

    is_joined = await check_user_joined(client, user_id)

    if is_joined:
        await callback_query.answer("✅ Verification Successful! Access Granted.", show_alert=True)
        text, buttons = get_welcome_menu(name, username, user_id)
        sent_message = await callback_query.message.edit_text(text=text, reply_markup=buttons)
        try:
            await sent_message.pin(both_sides=True)
        except Exception as e:
            print(f"Pin error: {e}")
    else:
        await callback_query.answer("❌ Aapne abhi tak Channel Join nahi kiya hai! Pehle Join karein fir Check karein.", show_alert=True)

print("Bot Successfully Start Ho Gaya Hai!")

if __name__ == "__main__":
    app.run()

