using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using Domain.Enums;

namespace Domain.Models
{


    public class Message
    {
        public Guid MessageId { get; set; }
        public Guid SenderId { get; set; }
        public Guid ReceiverId { get; set; }
        public string MessageText { get; set; } = null!;
        public DateTime SentAt { get; set; }

        public MessageStatus Status { get; set; }   // 👈 NEW

        //public bool IsDeleted { get; set; } = false;
        //public DateTime? DeletedAt { get; set; }
    }
}

