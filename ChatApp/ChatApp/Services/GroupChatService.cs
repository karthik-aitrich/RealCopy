using ChatApp.Data;
using ChatApp.Repositories;
using Domain.DTOs;
using Domain.Enums;
using Domain.Models;
using Domain.Repositories.Interfaces;
using Domain.Services.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace ChatApp.Services
{
    public class GroupChatService : IGroupChatService
    {
        private readonly IGroupChatRepository _repo;
        private readonly IUserRepository _userRepo;
        private readonly ChatDbContext _context;

        public GroupChatService(
            IGroupChatRepository repo,
            IUserRepository userRepo,
            ChatDbContext context
        )
        {
            _repo = repo;
            _userRepo = userRepo;
            _context = context;
        }

        public async Task ClearGroupChatAsync(Guid groupId, Guid userId)
        {
            var existing = await _context.Set<GroupChatClear>()
                .FirstOrDefaultAsync(x =>
                    x.GroupId == groupId &&
                    x.UserId == userId);

            if (existing == null)
            {
                _context.Add(new GroupChatClear
                {
                    Id = Guid.NewGuid(),
                    GroupId = groupId,
                    UserId = userId,
                    ClearedAt = DateTime.UtcNow
                });
            }
            else
            {
                existing.ClearedAt = DateTime.UtcNow;
            }

            await _context.SaveChangesAsync();
        }



        public async Task<GroupMessageDto?> DeleteGroupMessageAsync(Guid messageId, Guid userId)
        {
            var message = await _context.GroupMessages
                .FirstOrDefaultAsync(m => m.GroupMessageId == messageId);

            if (message == null) return null;

            if (message.SenderId != userId)
                return null;

            message.Status = MessageStatus.Deleted;
            message.MessageText = string.Empty;

            await _context.SaveChangesAsync();

            // 🔥 ADD THIS
            var user = await _userRepo.GetUserByIdAsync(message.SenderId);

            return new GroupMessageDto
            {
                MessageId = message.GroupMessageId,   // ✅ ADD
                GroupMessageId = message.GroupMessageId,
                GroupId = message.GroupId,
                SenderId = message.SenderId,
                SenderName = user?.UserName ?? "Unknown",
                MessageText = "This message was deleted",
                SentAt = message.SentAt,
                Status = MessageStatus.Deleted
            };
        }

        // 🔥 USED BY SIGNALR
        public async Task<GroupMessageDto> SendGroupMessageAsync(
            Guid groupId,
            Guid senderId,
            string message
        )
        {
            // 1️⃣ Save message (entity)
            var savedMessage = await _repo.AddMessageAsync(
                groupId,
                senderId,
                message
            );

            // 2️⃣ Get sender info
            var user = await _userRepo.GetUserByIdAsync(senderId);

            // 3️⃣ Return DTO (NO Id because entity doesn't have it yet)
            return new GroupMessageDto
            {
                MessageId = savedMessage.GroupMessageId,   // ✅ ADD
                GroupMessageId = savedMessage.GroupMessageId,
                GroupId = groupId,
                SenderId = senderId,
                SenderName = user?.UserName ?? "Unknown",
                MessageText = savedMessage.MessageText,
                SentAt = savedMessage.SentAt
            };


        }

        // 🔥 USED BY API CONTROLLER
        public async Task<IEnumerable<GroupMessageDto>> GetGroupMessagesAsync(Guid groupId, Guid currentUserId)
        {
            var messages = await _repo.GetGroupMessagesAsync(groupId);

            var result = new List<GroupMessageDto>();

            var clear = await _context.GroupChatClears
    .FirstOrDefaultAsync(x =>
        x.GroupId == groupId &&
        x.UserId == currentUserId);

            var clearedAt = clear?.ClearedAt;

            foreach (var m in messages)
            {
                // 🔥 THIS LINE IS THE KEY
                if (clearedAt != null && m.SentAt <= clearedAt)
                    continue;

                var user = await _userRepo.GetUserByIdAsync(m.SenderId);

                result.Add(new GroupMessageDto
                {
                    MessageId = m.GroupMessageId,
                    GroupMessageId = m.GroupMessageId,
                    GroupId = m.GroupId,
                    SenderId = m.SenderId,
                    SenderName = user?.UserName ?? "Unknown",

                    MessageText = m.Status == MessageStatus.Deleted
                        ? "This message was deleted"
                        : m.MessageText,

                    SentAt = m.SentAt,
                    Status = m.Status
                });
            }

            return result;
        }

        public async Task AddMemberAsync(Guid groupId, Guid userId, int role)
        {
            var member = new GroupMember
            {
                GroupMemberId = Guid.NewGuid(),
                GroupId = groupId,
                UserId = userId,
                Role = GroupRoleEnum.Member,
                JoinedAt = DateTime.UtcNow
            };

            await _repo.AddMemberAsync(member);
        }

        public async Task MarkGroupMessageSeenAsync(Guid messageId, Guid userId)
        {
            // 1️⃣ Check if already seen
            var alreadySeen = await _repo
                .HasUserSeenMessageAsync(messageId, userId);

            if (alreadySeen)
                return;

            // 2️⃣ Add seen record
            var seen = new GroupMessageSeen
            {
                Id = Guid.NewGuid(),
                GroupMessageId = messageId,
                UserId = userId,
                SeenAt = DateTime.UtcNow
            };

            await _repo.AddMessageSeenAsync(seen);
        }


    }
}
