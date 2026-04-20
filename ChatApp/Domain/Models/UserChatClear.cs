using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Domain.Models
{
    public class UserChatClear
    {
        public Guid Id { get; set; }

        public Guid UserId { get; set; }

        public Guid OtherUserId { get; set; }

        public DateTime ClearedAt { get; set; }
    }
}
