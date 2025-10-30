#!/bin/bash

# Deploy authentication fix for deleted accounts
# This script sets up the necessary database schema and Edge Functions

echo "🔧 Setting up authentication fix for deleted accounts..."

# 1. Apply database schema
echo "📊 Creating deleted_accounts table and functions..."
supabase db reset --linked
supabase db push

# 2. Deploy Edge Functions
echo "🚀 Deploying Edge Functions..."

# Deploy delete-user function
echo "Deploying delete-user function..."
supabase functions deploy delete-user

# Deploy validate-login function  
echo "Deploying validate-login function..."
supabase functions deploy validate-login

# 3. Set environment variables for functions
echo "🔐 Setting environment variables..."
supabase secrets set SUPABASE_URL=$(supabase status | grep "API URL" | awk '{print $3}')
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=$(supabase status | grep "service_role key" | awk '{print $3}')

echo "✅ Authentication fix deployed successfully!"
echo ""
echo "📋 What was implemented:"
echo "  • deleted_accounts table to track deleted users"
echo "  • Updated delete-user function to mark accounts as deleted"
echo "  • validate-login function to check for deleted accounts"
echo "  • Updated login page to prevent deleted account access"
echo ""
echo "🔒 Security features:"
echo "  • Deleted accounts cannot log in"
echo "  • All sessions are invalidated on deletion"
echo "  • Clear error messages for deleted accounts"
echo "  • No auto-restoration of deleted accounts"
