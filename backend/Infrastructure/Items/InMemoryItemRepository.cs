using System.Collections.Concurrent;
using Template.Api.Application.Items;
using Template.Api.Domain.Items;

namespace Template.Api.Infrastructure.Items;

public sealed class InMemoryItemRepository : IItemRepository
{
    private readonly ConcurrentDictionary<Guid, Item> _items = new();

    public Task<IReadOnlyCollection<Item>> GetAllAsync(
        CancellationToken cancellationToken)
    {
        cancellationToken.ThrowIfCancellationRequested();
        IReadOnlyCollection<Item> items = _items.Values
            .OrderByDescending(item => item.CreatedAt)
            .ToArray();
        return Task.FromResult(items);
    }

    public Task<Item?> GetByIdAsync(Guid id, CancellationToken cancellationToken)
    {
        cancellationToken.ThrowIfCancellationRequested();
        _items.TryGetValue(id, out var item);
        return Task.FromResult(item);
    }

    public Task<Item> CreateAsync(string name, CancellationToken cancellationToken)
    {
        cancellationToken.ThrowIfCancellationRequested();

        var item = new Item(Guid.NewGuid(), name, DateTimeOffset.UtcNow);
        _items[item.Id] = item;
        return Task.FromResult(item);
    }
}
