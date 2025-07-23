#!/bin/bash

echo "🚀 Starting Backend Service..."
echo ""

# Wait for PostgreSQL to be ready
echo "⏳ Waiting for PostgreSQL to be ready..."
until pg_isready -h postgres -p 5432 -U webapp_user; do
  echo "   PostgreSQL is not ready yet. Waiting..."
  sleep 2
done
echo "✅ PostgreSQL is ready!"

# Wait a bit more to ensure database is fully initialized
echo "⏳ Ensuring database is fully initialized..."
sleep 3

# Run database migration (if enabled)
if [ "$AUTO_MIGRATE" != "false" ]; then
    echo ""
    echo "🔧 Running database migration..."
    psql -h postgres -U webapp_user -d webapp_db -f migrate.sql
    migration_exit_code=$?

    if [ $migration_exit_code -eq 0 ]; then
        echo "✅ Migration completed successfully!"
    elif [ $migration_exit_code -eq 1 ]; then
        echo "⚠️  Migration completed with warnings (this is normal for existing databases)"
    else
        echo "❌ Migration failed with exit code: $migration_exit_code"
        echo "   This might be due to database connection issues or permission problems."
        echo "   The application will continue to start, but you may need to run migrations manually."
    fi
else
    echo ""
    echo "⏭️  Skipping automatic migration (AUTO_MIGRATE=false)"
fi

# Verify the schema
echo ""
echo "🔍 Verifying database schema..."
psql -h postgres -U webapp_user -d webapp_db -c "
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'users' 
ORDER BY ordinal_position;
" 2>/dev/null

echo ""
echo "📦 Starting Node.js server..."
echo ""

# Start the Node.js application
exec npm start 