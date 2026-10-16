using ChatApp.Controllers;
using ChatApp.Services;
using Domain.Services.Interfaces;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

public class GroupChatController : BaseAPIController<GroupChatController>
{
    private readonly IGroupChatService _service;

    public GroupChatController(IGroupChatService service)
    {
        _service = service;
    }
    //public GroupChatController(IGroupChatService service)
    //{
    //    _service = service;
    //}

    [HttpGet("group/{groupId}")]
    public async Task<IActionResult> GetGroupMessages(Guid groupId)
    {
        var userIdClaim = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;

        if (userIdClaim == null)
            return Unauthorized();

        var currentUserId = Guid.Parse(userIdClaim);

        return Ok(await _service.GetGroupMessagesAsync(groupId, currentUserId));
    }

    [HttpPost("group/add-member")]
    public async Task<IActionResult> AddMember(Guid groupId, Guid userId, int role)
    {
        await _service.AddMemberAsync(groupId, userId, role);
        return Ok();
    }

}

