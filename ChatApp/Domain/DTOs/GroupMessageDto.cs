using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using Domain.Enums;

namespace Domain.DTOs
{
    public class GroupMessageDto
    {
        public Guid MessageId  { get; set; }
        public Guid GroupMessageId { get; set; }
        public Guid GroupId { get; set; }
        public Guid SenderId { get; set; }
        public string SenderName { get; set; } = string.Empty;
        public string MessageText { get; set; } = string.Empty;
        public DateTime SentAt { get; set; }

        public MessageStatus Status { get; set; }   // 🔥 ADD THIS
        public string? ClientTempId { get; set; }
    }



}
