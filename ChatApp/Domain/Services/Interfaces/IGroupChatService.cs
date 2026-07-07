using Domain.DTOs;
using Domain.Models;

namespace Domain.Services.Interfaces
{
    public interface IGroupChatService
    {
        Task<GroupMessageDto> SendGroupMessageAsync(Guid groupId, Guid senderId, string message);
        Task<IEnumerable<GroupMessageDto>> GetGroupMessagesAsync(Guid groupId, Guid userId);
        Task AddMemberAsync(Guid groupId, Guid userId, int role);
        Task MarkGroupMessageSeenAsync(Guid messageId, Guid userId);

        Task<GroupMessageDto?> DeleteGroupMessageAsync(Guid messageId, Guid userId);

        Task ClearGroupChatAsync(Guid groupId, Guid userId);

    }
}
