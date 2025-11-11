// Script to help update Supabase credentials
// Run this in your browser console or as a Node.js script

const fs = require('fs');
const path = require('path');

// Your Supabase credentials (replace with your actual values)
const SUPABASE_URL = 'https://dbpmgzgeevgotfxsldjh.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRicG1nemdlZXZnb3RmeHNsZGpoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk1NjA2NDksImV4cCI6MjA3NTEzNjY0OX0.TLYH19D6jH0-g4OfbwI_XYPy8flk54JFDeZW05CirdU';

// Path to your HTML file
const htmlFilePath = './index.html';

function updateCredentials() {
    try {
        // Read the HTML file
        let htmlContent = fs.readFileSync(htmlFilePath, 'utf8');
        
        // Check if credentials are already configured
        if (htmlContent.includes('https://dbpmgzgeevgotfxsldjh.supabase.co') || htmlContent.includes('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRicG1nemdlZXZnb3RmeHNsZGpoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk1NjA2NDksImV4cCI6MjA3NTEzNjY0OX0.TLYH19D6jH0-g4OfbwI_XYPy8flk54JFDeZW05CirdU')) {
            console.log('🔧 Updating Supabase credentials...');
            
            // Replace placeholder values
            htmlContent = htmlContent.replace(
                "const SUPABASE_URL = 'https://dbpmgzgeevgotfxsldjh.supabase.co';",
                `const SUPABASE_URL = 'https://dbpmgzgeevgotfxsldjh.supabase.co';`
            );
            
            htmlContent = htmlContent.replace(
                "const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRicG1nemdlZXZnb3RmeHNsZGpoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk1NjA2NDksImV4cCI6MjA3NTEzNjY0OX0.TLYH19D6jH0-g4OfbwI_XYPy8flk54JFDeZW05CirdU';",
                `const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRicG1nemdlZXZnb3RmeHNsZGpoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk1NjA2NDksImV4cCI6MjA3NTEzNjY0OX0.TLYH19D6jH0-g4OfbwI_XYPy8flk54JFDeZW05CirdU';`
            );
            
            // Write the updated content back
            fs.writeFileSync(htmlFilePath, htmlContent, 'utf8');
            
            console.log('✅ Credentials updated successfully!');
            console.log('📝 Updated values:');
            console.log(`   URL: ${'https://dbpmgzgeevgotfxsldjh.supabase.co'}`);
            console.log(`   Key: ${'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRicG1nemdlZXZnb3RmeHNsZGpoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk1NjA2NDksImV4cCI6MjA3NTEzNjY0OX0.TLYH19D6jH0-g4OfbwI_XYPy8flk54JFDeZW05CirdU'.substring(0, 20)}...`);
            
        } else {
            console.log('ℹ️  Credentials appear to be already configured');
            console.log('📝 Current values:');
            
            // Extract current values
            const urlMatch = htmlContent.match(/const SUPABASE_URL = '([^']+)';/);
            const keyMatch = htmlContent.match(/const 'SUPABASE_ANON_KEY' = '([^']+)';/);
            
            if (urlMatch) console.log(`   URL: ${urlMatch[1]}`);
            if (keyMatch) console.log(`   Key: ${keyMatch[1].substring(0, 20)}...`);
        }
        
    } catch (error) {
        console.error('❌ Error updating credentials:', error.message);
        console.log('💡 Make sure to:');
        console.log('   1. Replace the placeholder values in this script');
        console.log('   2. Run: node update-credentials.js');
        console.log('   3. Or manually update the HTML file');
    }
}

// Run the update
updateCredentials();

// Instructions
console.log('\n📋 Next steps:');
console.log('1. Update the SUPABASE_URL and SUPABASE_ANON_KEY in this script');
console.log('2. Run: node update-credentials.js');
console.log('3. Open test-auth.html in your browser');
console.log('4. Test your authentication');
console.log('5. If successful, open your main index.html file');
