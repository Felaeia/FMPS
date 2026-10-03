using MediatR;
using Template.Api.Domain.Items;

namespace Template.Api.Application.Items.Queries;

public sealed record GetItemByIdQuery(Guid Id) : IRequest<Item?>;

public sealed class GetItemByIdQueryHandler(IItemRepository repository)
    : IRequestHandler<GetItemByIdQuery, Item?>
{
    public Task<Item?> Handle(
        GetItemByIdQuery request,
        CancellationToken cancellationToken) =>
        repository.GetByIdAsync(request.Id, cancellationToken);
}
