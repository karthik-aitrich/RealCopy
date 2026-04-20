using ChatApp.Data;
using Domain.Models;
using Domain.Repositories.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace ChatApp.Repositories
{
    public class UserChatClearRepository : IUserChatClearRepository
    {
        private readonly ChatDbContext _context;

        public UserChatClearRepository(ChatDbContext context)
        {
            _context = context;
        }

        public async Task<UserChatClear?> GetAsync(Guid userId, Guid otherUserId)
        {
            return await _context.UserChatClears
                .FirstOrDefaultAsync(x =>
                    x.UserId == userId &&
                    x.OtherUserId == otherUserId);
        }

        public async Task AddAsync(UserChatClear clear)
        {
            _context.UserChatClears.Add(clear);
            await _context.SaveChangesAsync();
        }

        public async Task UpdateAsync(UserChatClear clear)
        {
            _context.UserChatClears.Update(clear);
            await _context.SaveChangesAsync();
        }
    }
}
