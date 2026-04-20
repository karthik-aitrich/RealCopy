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

        public ChatService(IChatRepository chatRepository,IUserChatClearRepository userChatClearRepository)
        {
            _chatRepository = chatRepository;
            _userChatClearRepository = userChatClearRepository;
        }

        public async Task<Message?> DeleteMessageAsync(Guid messageId, Guid currentUserId)
        {
            var message = await _chatRepository.GetByIdAsync(messageId);

            if (message == null)
                return null;

            if (message.SenderId != currentUserId)
                throw new UnauthorizedAccessException("You can delete only your own messages.");

            if (message.IsDeleted)
                return message;

            message.IsDeleted = true;
            message.DeletedAt = DateTime.UtcNow;

            await _chatRepository.UpdateAsync(message);

            return message;
        }

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


        public async Task<Message> SendMessageAsync( Guid senderId,Guid receiverId,string message)
        {
            var msg = new Message
            {
                MessageId = Guid.NewGuid(),
                SenderId = senderId,    
                ReceiverId = receiverId,
                MessageText = message,
                SentAt = DateTime.Now,
                Status = MessageStatusEnum.Sent
            };

            await _chatRepository.SaveMessageAsync(msg);

            return msg; // 🔥 THIS IS THE KEY
        }


        public async Task<List<Message>> GetChatHistoryAsync(Guid user1, Guid user2)
        {
            return await _chatRepository.GetChatHistoryAsync(user1, user2);
        }

        public async Task MarkAsDelivered(Guid messageId)
        {
            var msg = await _chatRepository.GetByIdAsync(messageId);
            if (msg != null && msg.Status == MessageStatusEnum.Sent)
            {
                msg.Status = MessageStatusEnum.Delivered;
                await _chatRepository.UpdateAsync(msg);
            }
        }

        public async Task MarkAsSeen(Guid messageId)
        {
            var msg = await _chatRepository.GetByIdAsync(messageId);
            if (msg != null)
            {
                msg.Status = MessageStatusEnum.Read;
                await _chatRepository.UpdateAsync(msg);
            }
        }

    }
}
