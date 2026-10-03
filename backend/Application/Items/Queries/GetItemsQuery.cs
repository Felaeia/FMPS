using MediatR;
using Template.Api.Domain.Items;

namespace Template.Api.Application.Items.Queries;

public sealed record GetItemsQuery : IRequest<IReadOnlyCollection<Item>>;

public sealed class GetItemsQueryHandler(IItemRepository repository)
    : IRequestHandler<GetItemsQuery, IReadOnlyCollection<Item>>
{
    public Task<IReadOnlyCollection<Item>> Handle(
        GetItemsQuery request,
        CancellationToken cancellationToken) =>
        repository.GetAllAsync(cancellationToken);
}
