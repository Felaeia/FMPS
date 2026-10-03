namespace Template.Api.Domain.Items;

public sealed record Item(Guid Id, string Name, DateTimeOffset CreatedAt);
