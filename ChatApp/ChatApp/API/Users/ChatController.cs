using System.Security.Claims;
using ChatApp.Data;
using Domain.Models;
using Domain.Repositories.Interfaces;
using Domain.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace ChatApp.Controllers
{
    public class ChatController : BaseAPIController<ChatController>
    {
        private readonly ChatDbContext _context;
        private readonly IChatService _chatService;
        private readonly IChatRepository _chatRepo;

        public ChatController(ChatDbContext context, IChatService chatService, IChatRepository chatRepo)
        {
            _context = context;
            _chatRepo = chatRepo;
            _chatService = chatService;


        }

        [Authorize]
        [HttpDelete("{messageId}")]
        public async Task<IActionResult> DeleteMessage(Guid messageId)
        {
            var userIdClaim = User.FindFirst("sub")?.Value;

            if (userIdClaim == null)
                return Unauthorized();

            var currentUserId = Guid.Parse(userIdClaim);

            var deletedMessage = await _chatService
                .DeleteMessageAsync(messageId, currentUserId);

            if (deletedMessage == null)
                return NotFound();

            return Ok(new
            {
                message = "Message deleted successfully",
                messageId = deletedMessage.MessageId
            });
        }



        // GET: api/v1/chat/history/{user1}/{user2}
        [Authorize]
        [HttpGet("history/{user1}/{user2}")]
        public async Task<IActionResult> GetChatHistory(Guid user1, Guid user2)
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (userIdClaim == null)
                return Unauthorized();

            var currentUserId = Guid.Parse(userIdClaim);

            // 🔥 get clear record
            var clearRecord = await _context.UserChatClears
                .FirstOrDefaultAsync(c =>
                    c.UserId == currentUserId &&
                    c.OtherUserId == user2);

            var clearedAt = clearRecord?.ClearedAt;

            var messages = await _context.Messages
                .Where(m =>
                    (
                        (m.SenderId == user1 && m.ReceiverId == user2) ||
                        (m.SenderId == user2 && m.ReceiverId == user1)
                    )
                    &&
                    (clearedAt == null || m.SentAt > clearedAt)
                )
                .OrderBy(m => m.SentAt)
                .Select(m => new
                {
                    m.MessageId,
                    m.SenderId,
                    m.ReceiverId,

                    // 🔥 FIXED
                    MessageText = m.Status == Domain.Enums.MessageStatus.Deleted
                        ? "This message was deleted"
                        : m.MessageText,

                    m.SentAt,

                    // 🔥 send status to frontend
                    Status = m.Status
                })
                .ToListAsync();

            return Ok(messages);
        }


        [HttpPost("clear/{otherUserId}")]
        public async Task<IActionResult> ClearChat(Guid otherUserId)
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;

            if (userIdClaim == null)
                return Unauthorized();

            var currentUserId = Guid.Parse(userIdClaim);

            await _chatService.ClearChatAsync(currentUserId, otherUserId);

            return Ok(new { message = "Chat cleared successfully" });
        }



        [HttpPost("messages/seen/{messageId}")]
        public async Task<IActionResult> MarkSeen(Guid messageId)
        {
            await _chatService.MarkAsSeen(messageId);
            return Ok();
        }

    }
}
