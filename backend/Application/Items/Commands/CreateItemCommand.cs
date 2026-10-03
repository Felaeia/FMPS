using MediatR;
using Template.Api.Domain.Items;

namespace Template.Api.Application.Items.Commands;

public sealed record CreateItemCommand(string Name) : IRequest<Item>;

public sealed class CreateItemCommandHandler(IItemRepository repository)
    : IRequestHandler<CreateItemCommand, Item>
{
    public Task<Item> Handle(
        CreateItemCommand request,
        CancellationToken cancellationToken) =>
        repository.CreateAsync(request.Name.Trim(), cancellationToken);
}
