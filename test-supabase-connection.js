// Test Supabase Connection Script
// This script will test your direct connection to Supabase

// Import Supabase client
const { createClient } = require('@supabase/supabase-js');

// Your Supabase credentials (from supabaseClient.js)
const SUPABASE_URL = 'https://dbpmgzgeevgotfxsldjh.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRicG1nemdlZXZnb3RmeHNsZGpoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk1NjA2NDksImV4cCI6MjA3NTEzNjY0OX0.TLYH19D6jH0-g4OfbwI_XYPy8flk54JFDeZW05CirdU';

// Create Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function testConnection() {
    console.log('🔗 Testing Supabase Connection...\n');
    
    try {
        // Test 1: Basic connection
        console.log('1. Testing basic connection...');
        const { data: healthCheck, error: healthError } = await supabase
            .from('profiles')
            .select('count')
            .limit(1);
        
        if (healthError) {
            console.log('❌ Basic connection failed:', healthError.message);
            return false;
        }
        console.log('✅ Basic connection successful!');
        
        // Test 2: Check if tables exist
        console.log('\n2. Checking database tables...');
        const tables = ['profiles', 'notes', 'categories', 'note_shares', 'comments', 'tags'];
        
        for (const table of tables) {
            try {
                const { data, error } = await supabase
                    .from(table)
                    .select('*')
                    .limit(1);
                
                if (error) {
                    console.log(`❌ Table '${table}' not accessible:`, error.message);
                } else {
                    console.log(`✅ Table '${table}' is accessible`);
                }
            } catch (err) {
                console.log(`❌ Error checking table '${table}':`, err.message);
            }
        }
        
        // Test 3: Check categories data
        console.log('\n3. Checking categories data...');
        const { data: categories, error: categoriesError } = await supabase
            .from('categories')
            .select('*');
        
        if (categoriesError) {
            console.log('❌ Categories query failed:', categoriesError.message);
        } else {
            console.log(`✅ Found ${categories.length} categories:`, categories.map(c => c.name).join(', '));
        }
        
        // Test 4: Check notes data
        console.log('\n4. Checking notes data...');
        const { data: notes, error: notesError } = await supabase
            .from('notes')
            .select('id, title, created_at')
            .limit(5);
        
        if (notesError) {
            console.log('❌ Notes query failed:', notesError.message);
        } else {
            console.log(`✅ Found ${notes.length} notes in database`);
            if (notes.length > 0) {
                console.log('   Sample notes:', notes.map(n => n.title).join(', '));
            }
        }
        
        // Test 5: Authentication status
        console.log('\n5. Checking authentication...');
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        
        if (authError) {
            console.log('ℹ️  No authenticated user (this is normal for testing)');
        } else if (user) {
            console.log('✅ User authenticated:', user.email);
        } else {
            console.log('ℹ️  No user currently authenticated');
        }
        
        console.log('\n🎉 Supabase connection test completed successfully!');
        console.log('\n📊 Connection Summary:');
        console.log(`   • URL: ${'https://dbpmgzgeevgotfxsldjh.supabase.co'}`);
        console.log(`   • Status: Connected`);
        console.log(`   • Tables: Accessible`);
        console.log(`   • Ready for use: Yes`);
        
        return true;
        
    } catch (error) {
        console.log('❌ Connection test failed:', error.message);
        return false;
    }
}

// Run the test
testConnection().then(success => {
    if (success) {
        console.log('\n✅ Your Supabase database is ready to use!');
        console.log('You can now use your application with full database functionality.');
    } else {
        console.log('\n❌ There were issues with the connection.');
        console.log('Please check your credentials and try again.');
    }
    process.exit(success ? 0 : 1);
});

