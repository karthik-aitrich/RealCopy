using AutoMapper.Execution;
using ChatApp.Controllers;
using ChatApp.Hubs;
using Domain.DTOs;
using Domain.Models;
using Domain.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;

[Authorize]
[ApiController]
[Route("api/v1/group")]
public class GroupController : BaseAPIController<GroupController>
{
    private readonly IGroupService _service;
	private readonly IHubContext<ChatHub> _hubContext;

	public GroupController(IGroupService service, IHubContext<ChatHub> hubContext)
    {
        _service = service;
		_hubContext = hubContext;
	}

    // =========================================
    // CREATE GROUP (OLD – STILL SUPPORTED)
    // =========================================
    [HttpPost("groups")]
    public async Task<IActionResult> Create(
        [FromQuery] string name,
        [FromQuery] Guid creatorId
    )
    {
        await _service.CreateGroupAsync(name, creatorId);

        return Ok("Group created");
    }

	[HttpPost("groups-with-members")]
	public async Task<IActionResult> CreateWithMembers(
	[FromBody] CreateGroupDto dto)
	{
		var userIdClaim = User.FindFirst("userId")?.Value;
		if (string.IsNullOrEmpty(userIdClaim))
			return Unauthorized();

		var creatorId = Guid.Parse(userIdClaim);

		var groupsWithMembers =
			await _service.CreateGroupAsync(creatorId, dto);

		await _hubContext.Clients
			.Users(groupsWithMembers.MemberIds.Select(x => x.ToString()))
			.SendAsync("GroupCreated", new
			{
				groupId = groupsWithMembers.GroupId,
				groupName = groupsWithMembers.GroupName,
				memberIds = groupsWithMembers.MemberIds
			});

		return Ok(new
		{
			groupsWithMembers.GroupId
		});
	}
	[HttpGet("users/{userId}/groups")]
    public async Task<IActionResult> GetUserGroups(Guid userId)
    {
        var groups = await _service.GetUserGroupsAsync(userId);
        return Ok(groups);
    }

    [HttpGet("{groupId}/members")]
    public async Task<IActionResult> GetGroupMembers(Guid groupId)
    {
        var members = await _service.GetGroupMembersAsync(groupId);

        return Ok(members.Select(m => new {
            userId = m.UserId,
            userName = m.UserName,
            role = m.Role
        }));
    }


    [HttpPost("{groupId}/members")]
    public async Task<IActionResult> AddMember(Guid groupId,[FromBody] AddMemberDto dto)
    {
        var adminIdClaim = User.FindFirst("userId")?.Value;
        if (string.IsNullOrEmpty(adminIdClaim))
            return Unauthorized();

        var adminId = Guid.Parse(adminIdClaim);

        await _service.AddMemberAsync(groupId, dto.UserId, adminId);
		// Notify all users currently viewing this group
		await _hubContext.Clients.Group(groupId.ToString())
			.SendAsync("MemberAdded", groupId, dto.UserId);

		// Notify the newly added user so that his sidebar refreshes
		await _hubContext.Clients.User(dto.UserId.ToString())
			.SendAsync("AddedToGroup");

		return Ok();
    }


    [HttpDelete("{groupId}/members/{userId}")]
    public async Task<IActionResult> RemoveMember(Guid groupId, Guid userId)
    {
		var adminId = Guid.Parse(User.FindFirst("userId")?.Value);
		await _service.RemoveMemberAsync(
			groupId,
			userId,
            adminId

           
        );
		await _hubContext.Clients.User(userId.ToString())
		.SendAsync("RemovedFromGroup", groupId);
		// Notify everyone in this chat group
		await _hubContext.Clients.Group(groupId.ToString())
			.SendAsync("MemberLeft", groupId, userId);
		return Ok();
    }

    // =========================================
    // LEAVE GROUP
    // =========================================
    [HttpDelete("{groupId}/members/me")]
    public async Task<IActionResult> Leave( Guid groupId)
    {
        try
        {


            var userId = Guid.Parse(User.FindFirst("userId")?.Value);

            await _service.LeaveGroupAsync(
               groupId,
               userId
            );
			// Notify everyone in this chat group
			await _hubContext.Clients.Group(groupId.ToString())
				.SendAsync("MemberLeft", groupId, userId);

			// Notify the user who left so that he can remove the group
			// from his sidebar if needed
			await _hubContext.Clients.User(userId.ToString())
				.SendAsync("RemovedFromGroup", groupId);

			return Ok();
        }
		catch (Exception ex)
		{
			return BadRequest(new { message = ex.Message });
		}
	}

	// =========================================
	// CHANGE ROLE
	// =========================================
	[HttpPatch("{groupId}/members/{userId}")]
	public async Task<IActionResult> ChangeRole(Guid groupId, Guid userId,int role)
	{
		await _service.ChangeRoleAsync(
		  groupId,
			userId,
			role
		);

		return Ok();

	}
	[HttpDelete("{groupId}")]

	public async Task<IActionResult> DeleteGroup(Guid groupId)
	{
		try
		{
			var userId = Guid.Parse(User.FindFirst("userId")?.Value);

			await _service.DeleteGroup(groupId, userId);

			return Ok(new { message = "Group deleted successfully" });
		}
		catch (Exception ex)
		{
			return BadRequest(new { message = ex.Message });
		}
	}

}
