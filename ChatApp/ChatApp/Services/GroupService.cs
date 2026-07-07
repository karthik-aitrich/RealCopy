using ChatApp.Hubs;
using Domain.DTOs;
using Domain.Enums;
using Domain.Models;
using Domain.Repositories.Interfaces;
using Domain.Services.Interfaces;
using Microsoft.AspNetCore.SignalR;

public class GroupService : IGroupService
{
    private readonly IGroupRepository _repo;
	private readonly IHubContext<ChatHub> _hubContext;

	public GroupService(IGroupRepository repo, IHubContext<ChatHub> hubContext)
    { 
        _repo = repo;
		_hubContext = hubContext;

	}

    public async Task CreateGroupAsync(string name, Guid creatorId)
    {
        await _repo.CreateGroupAsync(name, creatorId);
    }

    public async Task<List<ChatGroup>> GetUserGroupsAsync(Guid userId) 
    {
        return await _repo.GetUserGroupsAsync(userId); 
    }

    public async Task<GroupDTO> CreateGroupAsync(Guid creatorId, CreateGroupDto dto)
    {
        var members = dto.MemberIds
            .Append(creatorId)
            .Distinct()
            .ToList();

        if (members.Count < 3)
            throw new Exception("A group must have at least 3 members");
         
        var groupId = await _repo.CreateGroupAsync(dto.Name, creatorId);
		var groupDto = new GroupDTO
		{
			GroupId = groupId,
			GroupName = dto.Name,
			MemberIds = members
		};

		foreach (var userId in members)
        {
            if (userId == creatorId) continue;
            await _repo.AddMemberAsync(groupId, userId, creatorId);

        }

		// Notify all group members
		await _hubContext.Clients
			.Users(members.Select(x => x.ToString()))
			.SendAsync("GroupCreated", groupDto);

		return groupDto;
    }

     
    public async Task AddMemberAsync(Guid groupId, Guid userId, Guid adminId)
    {
        await _repo.AddMemberAsync(groupId, userId, adminId);
    }


    public async Task RemoveMemberAsync(Guid groupId, Guid userId, Guid adminId)
    {
        await _repo.RemoveMemberAsync(groupId, userId, adminId);
    }

    public async Task LeaveGroupAsync(Guid groupId, Guid userId)
    {
        await _repo.LeaveGroupAsync(groupId, userId);
    }

    public async Task ChangeRoleAsync(Guid groupId, Guid userId, int role)
    {
        await _repo.ChangeRoleAsync(groupId, userId, (GroupRoleEnum)role);
    }

    public async Task<List<GroupMemberDto>> GetGroupMembersAsync(Guid groupId)
    {
        return await _repo.GetGroupMembersAsync(groupId);
    }

	public async Task DeleteGroup(Guid groupId, Guid UserId)
    {
        await _repo.DeleteGroup(groupId, UserId);
		await _hubContext.Clients
	.User(UserId.ToString())
	.SendAsync("GroupDeleted", groupId);
	}
}
