using System.ComponentModel.DataAnnotations;
using MediatR;
using Microsoft.AspNetCore.Mvc;
using Template.Api.Application.Items.Commands;
using Template.Api.Application.Items.Queries;
using Template.Api.Domain.Items;

namespace Template.Api.Controllers;

[ApiController]
[Route("api/items")]
public sealed class ItemsController(ISender sender) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IReadOnlyCollection<Item>>> GetAll(
        CancellationToken cancellationToken)
    {
        var items = await sender.Send(new GetItemsQuery(), cancellationToken);
        return Ok(items);
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<Item>> GetById(
        Guid id,
        CancellationToken cancellationToken)
    {
        var item = await sender.Send(new GetItemByIdQuery(id), cancellationToken);
        return item is null ? NotFound() : Ok(item);
    }

    [HttpPost]
    public async Task<ActionResult<Item>> Create(
        [FromBody] CreateItemRequest request,
        CancellationToken cancellationToken)
    {
        var item = await sender.Send(
            new CreateItemCommand(request.Name),
            cancellationToken);

        return CreatedAtAction(nameof(GetById), new { id = item.Id }, item);
    }
}

public sealed class CreateItemRequest
{
    [Required]
    [StringLength(100)]
    [RegularExpression(@".*\S.*", ErrorMessage = "Name cannot be empty.")]
    public string Name { get; init; } = string.Empty;
}
