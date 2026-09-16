### EDGE2 Easy LIMS

#### Database Setup
1. Configure your database connection in `.env` (or set `DATABASE_URL` / `DB_USER`, `DB_PASSWORD`, `DB_HOST`, `DB_PORT`, `DB_NAME`).
2. Apply the database schema and default seeds:
   - Via Makefile: `make db-setup`
   - Via PowerShell: `.\make.ps1 db-setup`
   - Or run `setup.sql` directly in your PostgreSQL / Supabase SQL Editor.

#### Starting Development Server
```bash
make dev
```

<!-- 
### Install `pg_dump`

In *nix

```
sudo apt install postgresql-client-common
sudo apt update && sudo apt install postgresql-client
```

On Mac

```
brew install postgresql@17
```

### Export PostgreSQL Database as SQL file

```
#!/bin/bash

# PostgreSQL connection variables
DB_HOST="localhost"
DB_PORT="5432"
DB_NAME="postgres"
DB_USER="postgres"
DB_PASSWORD="your-db-password"
OUTPUT_FILE="postgres_backup.sql"

# Export password so pg_dump can use it
export PGPASSWORD=$DB_PASSWORD

# Run pg_dump
pg_dump -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -F c -b -v -f $OUTPUT_FILE

# Unset password
unset PGPASSWORD

echo "Backup completed: $OUTPUT_FILE"
```

### Android App

```
sudo apt update
sudo apt install openjdk-17-jdk -y

# Install SDKMAN
curl -s "https://get.sdkman.io" | bash

# Load SDKMAN into your shell
source "$HOME/.sdkman/bin/sdkman-init.sh"

# Install Gradle (latest stable)
sdk install gradle
``` -->