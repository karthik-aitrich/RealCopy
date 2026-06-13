using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using Domain.Enums;
using Domain.Models;

public class GroupMessage
{
    [Key]
    public Guid GroupMessageId { get; set; }

    public Guid GroupId { get; set; }
    public Guid SenderId { get; set; }

    public string MessageText { get; set; } = null!;
    public DateTime SentAt { get; set; }

    // 🔥 ADD THIS
    public User Sender { get; set; } = null!;
    public MessageStatus Status { get; set; } = MessageStatus.Normal;

    public ICollection<GroupMessageSeen> SeenBy { get; set; }
}

