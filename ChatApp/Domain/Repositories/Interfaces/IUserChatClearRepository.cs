using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using Domain.Models;

namespace Domain.Repositories.Interfaces
{
    public interface IUserChatClearRepository
    {
        Task<UserChatClear?> GetAsync(Guid userId, Guid otherUserId);
        Task AddAsync(UserChatClear clear);
        Task UpdateAsync(UserChatClear clear);
    }
}
