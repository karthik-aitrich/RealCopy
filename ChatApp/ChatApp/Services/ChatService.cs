using Domain.Repositories.Interfaces;
using Domain.Enums;
using Domain.Models;
using Domain.Services.Interfaces;

namespace ChatApp.Services
{
    public class ChatService : IChatService
    {
        private readonly IChatRepository _chatRepository;
        private readonly IUserChatClearRepository _userChatClearRepository;

        public ChatService(
            IChatRepository chatRepository,
            IUserChatClearRepository userChatClearRepository)
        {
            _chatRepository = chatRepository;
            _userChatClearRepository = userChatClearRepository;
        }

        // 🗑 DELETE MESSAGE
        public async Task<Message?> DeleteMessageAsync(Guid messageId, Guid currentUserId)
        {
            var message = await _chatRepository.GetByIdAsync(messageId);

            if (message == null)
                return null;

            if (message.SenderId != currentUserId)
                throw new UnauthorizedAccessException("You can delete only your own messages.");

            // 🔥 FIX: use Status instead of IsDeleted
            if (message.Status == MessageStatus.Deleted)
                return message;

            message.Status = MessageStatus.Deleted;

            await _chatRepository.UpdateAsync(message);

            return message;
        }

        // 🧹 CLEAR CHAT (PER USER)
        public async Task ClearChatAsync(Guid currentUserId, Guid otherUserId)
        {
            var existing = await _userChatClearRepository
                .GetAsync(currentUserId, otherUserId);

            if (existing == null)
            {
                var clear = new UserChatClear
                {
                    Id = Guid.NewGuid(),
                    UserId = currentUserId,
                    OtherUserId = otherUserId,
                    ClearedAt = DateTime.UtcNow
                };

                await _userChatClearRepository.AddAsync(clear);
            }
            else
            {
                existing.ClearedAt = DateTime.UtcNow;
                await _userChatClearRepository.UpdateAsync(existing);
            }
        }

        // 📩 SEND MESSAGE
        public async Task<Message> SendMessageAsync(Guid senderId, Guid receiverId, string message)
        {
            var msg = new Message
            {
                MessageId = Guid.NewGuid(),
                SenderId = senderId,
                ReceiverId = receiverId,
                MessageText = message,
                SentAt = DateTime.UtcNow,

                // 🔥 FIX: use MessageStatus (NOT MessageStatusEnum)
                Status = MessageStatus.Normal
            };

            await _chatRepository.SaveMessageAsync(msg);

            return msg;
        }

        // 📜 HISTORY
        public async Task<List<Message>> GetChatHistoryAsync(Guid user1, Guid user2)
        {
            return await _chatRepository.GetChatHistoryAsync(user1, user2);
        }

        // 📬 DELIVERED
        public async Task MarkAsDelivered(Guid messageId)
        {
            var msg = await _chatRepository.GetByIdAsync(messageId);

            if (msg != null && msg.Status == MessageStatus.Normal)
            {
                msg.Status = MessageStatus.Normal; // or Delivered if you extend enum
                await _chatRepository.UpdateAsync(msg);
            }
        }

        // 👁 SEEN
        public async Task MarkAsSeen(Guid messageId)
        {
            var msg = await _chatRepository.GetByIdAsync(messageId);

            if (msg != null)
            {
                msg.Status = MessageStatus.Normal; // or Read if extended
                await _chatRepository.UpdateAsync(msg);
            }
        }
    }
}