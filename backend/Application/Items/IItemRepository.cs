using Template.Api.Domain.Items;

namespace Template.Api.Application.Items;

public interface IItemRepository
{
    Task<IReadOnlyCollection<Item>> GetAllAsync(CancellationToken cancellationToken);
    Task<Item?> GetByIdAsync(Guid id, CancellationToken cancellationToken);
    Task<Item> CreateAsync(string name, CancellationToken cancellationToken);
}
