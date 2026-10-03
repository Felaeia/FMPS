using Template.Api.Application.Items;
using Template.Api.Application.Items.Queries;
using Template.Api.Infrastructure;
using Template.Api.Infrastructure.Items;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddMediatR(configuration =>
    configuration.RegisterServicesFromAssemblyContaining<GetItemsQuery>());
builder.Services.AddSingleton<IItemRepository, InMemoryItemRepository>();

var frontendOrigins =
    builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>() ?? [];
if (frontendOrigins.Length == 0)
{
    throw new InvalidOperationException(
        "Configure at least one allowed frontend origin in Cors:AllowedOrigins.");
}

builder.Services.AddCors(options =>
{
    options.AddPolicy("Frontend", policy =>
        policy.WithOrigins(frontendOrigins)
            .AllowAnyHeader()
            .AllowAnyMethod());
});

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();
app.UseCors("Frontend");
app.MapControllers();

app.Run();
