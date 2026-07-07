using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Domain.DTOs
{
	public class GroupDTO
	{
		public Guid GroupId { get; set; }
		public string GroupName { get; set; }
		public List<Guid> MemberIds { get; set; } = new();

	}
}
