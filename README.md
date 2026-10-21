## Technology

- **Frontend:** React, TypeScript, Vite, Tailwind CSS
- **Backend:** ASP.NET Core 8 Web API, MediatR
- **Database:** Supabase
- **Agent for Automation:** Fara-7B
- **Automated Scraping Agent:** Playwright

## Repository layout

```text
backend/
  Controllers/ItemsController.cs
  Application/Items/
    Commands/CreateItemCommand.cs
    Queries/GetItemsQuery.cs
    Queries/GetItemByIdQuery.cs
    IItemRepository.cs
  Domain/Items/Item.cs
  Infrastructure/Items/InMemoryItemRepository.cs

frontend/
  src/
    ui/                             # Low-level design-system primitives
    common/                         # Shared, domain-neutral UI
    global/                         # Application shell and global UI
    feature/
      Scoutline/
        components/
        api/                        # Feature API boundary placeholder
        componentPlaceholder.tsx    # Example feature component
        constant/                   # Feature constants placeholder
        types/                      # Typescript types and shared interfaces
        util/                       # Pure utility functions
    api.ts
    App.css
    App.tsx
    index.css
    main.tsx
```

## Run locally

Prerequisites: 
- Node.js with npm and the .NET 8 SDK.
- Install WSL2 (For Windows)

### 1. Start the API

In the repository root:

```powershell
dotnet dev-certs https --trust
dotnet run --project backend\Template.Api.csproj --launch-profile https
```

The API uses `https://localhost:7022` for HTTPS and Swagger is at
`https://localhost:7022/swagger`.

### 2. Start the frontend

In another terminal, from the repository root:

```powershell
Copy-Item frontend\.env.example frontend\.env
Set-Location frontend
npm ci
npm run dev
```

Open the Vite URL shown in the terminal, usually `http://localhost:5173`.
Change `VITE_API_BASE_URL` in `frontend\.env` if the API URL is different.

The API allows `http://localhost:5173` by default. Configure other frontend
origins with standard ASP.NET Core configuration, for example:

```powershell
$env:Cors__AllowedOrigins__0 = "https://your-frontend.example"
```

### 3. Get the Fara Agent and Run - llama.cpp 8GB version
  ## 1. Clone repository
    git clone https://github.com/microsoft/fara.git
    cd fara
  
  ## 2. Setup environment in WSL
    python3 -m venv.venv
    source.venv/bin/activate
    pip install -e.
  
  ## 3. Install llama.cpp - Build Deps
    # common deps
        sudo dnf install -y git cmake gcc-c++ python3-devel[Fedora]
        ~ For Devices with a GPU

    # add NVIDIA repo - auto-detects your Fedora version
        sudo dnf install -y dnf-plugins-core
        sudo dnf config-manager addrepo --from-repofile=https://developer.download.nvidia.com/compute/cuda/repos/fedora$(rpm -E %fedora)/x86_64/cuda-fedora$(rpm -E %fedora).repo
        sudo dnf clean expire-cache
        # now it will be found
        sudo dnf install -y cuda-toolkit

    # clone and build with CUDA - do this in WSL home, NOT /mnt/c/ - it's 10x faster
        cd ~
        git clone https://github.com/ggerganov/llama.cpp
        cd llama.cpp
        cmake -B build -DGGML_CUDA=1
        cmake --build build --config Release -j $(nproc)[WSL2]
        ~ For CPU Only Devices

    # clone and build CPU only
        cd ~
        git clone https://github.com/ggerganov/llama.cpp
        cd llama.cpp
        cmake -B build -DGGML_NATIVE=OFF
        cmake --build build --config Release -j $(nproc)

    # converter deps
        python3 -m venv ~/llama-venv
        source ~/llama-venv/bin/activate
        pip install -r requirements.txt huggingface_hub
  
  ## 4. Get and Quantize Fara-7B to 8GB [Q4_K_M]
    mkdir -p ~/models
    # download
      hf download microsoft/Fara-7B --local-dir ~/models/Fara-7B-hf
    # convert - for Qwen2.5-VL this creates 2 files: model + mmproj for vision
      python convert_hf_to_gguf.py ~/models/Fara-7B-hf --outfile ~/models/fara-7b-f16.gguf
    # quantize to Q4_K_M - this is what gets you to 8GB
      ./build/bin/llama-quantize ~/models/fara-7b-f16.gguf ~/models/fara-7b-q4_k_m.gguf Q4_K_M

  ## 5. Install Playwright in WSL
    playwright install
      .venv/bin/playwright install

    note: WSL uses Fedora
      sudo dnf install nss freetype harfbuzz liberation-fonts libX11 libXcomposite libXdamage libXext libXfixes libXrandr libXrender libXtst cups-libs dbus-libs alsa-lib pango cairo
      sudo dnf install -y alsa-lib atk at-spi2-atk cups-libs libdrm libXcomposite libXdamage libXfixes libXrandr mesa-libgbm pango libxkbcommon
  
  ## 6. Run Fara Agent Locally
    ~/llama.cpp/build/bin/llama-server -m ~/models/fara-7b-q4_k_m.gguf --mmproj ~/models/fara-7b-mmproj-f16.gguf --host 0.0.0.0 --port 5000 --ctx-size 2048
  
  ## 7. Test Fara Agent
    python -m fara.run_fara --task "what is one plus one"

  ### Add a monitored Facebook page

  Keep the Fara-compatible llama.cpp server running at `http://localhost:5000` while
  using Add a page. The backend asks Fara for the requested settings, then uses
  `frontend/agent/scripts/scrape-facebook.mjs` as the immutable scraper template;
  it only substitutes the approved page URL and post limit. Generated scripts are
  saved under `frontend/agent/scripts/repository/`. The preview endpoint executes
  that saved script with Node.js and returns its real `posts.json` output. Set
  `Fara__BaseUrl` if the backend cannot reach the model at the default address.


## Common commands

Run frontend commands from `frontend`:

```powershell
npm run lint
npm run build
```

Run the backend build from the repository root:

```powershell
dotnet build backend\Template.Api.csproj
```
