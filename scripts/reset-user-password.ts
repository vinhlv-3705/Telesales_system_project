import { prisma } from '@/lib/prisma.js';
import bcrypt from 'bcryptjs';

async function resetUserPassword() {
  const username = process.argv[2]; // Get username from command line argument
  const newPassword = process.argv[3] || 'van123'; // Default to van123 if not provided

  if (!username) {
    console.error('Usage: npx ts-node scripts/reset-user-password.ts <username> [newPassword]');
    process.exit(1);
  }

  try {
    console.log(`Resetting password for user: ${username}`);
    
    // Hash the new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    console.log(`New password hash: ${hashedPassword.substring(0, 20)}...`);
    
    // Update user password
    const updatedUser = await prisma.user.update({
      where: { username },
      data: { password: hashedPassword },
      select: {
        id: true,
        username: true,
        role: true,
      },
    });
    
    console.log(`✅ Password reset successfully for user: ${updatedUser.username}`);
    console.log(`   Role: ${updatedUser.role}`);
    console.log(`   New password: ${newPassword}`);
    console.log(`   Please login with username: ${username} and password: ${newPassword}`);
  } catch (error) {
    console.error('❌ Error resetting password:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

resetUserPassword();
