def generate_chat_key(user1_id, user2_id):
    return f"{min(user1_id, user2_id)}_{max(user1_id, user2_id)}"