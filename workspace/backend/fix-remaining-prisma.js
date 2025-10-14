const fs = require('fs');
const path = require('path');

// Read the auth.ts file
const authPath = path.join(__dirname, 'src', 'routes', 'auth.ts');
let content = fs.readFileSync(authPath, 'utf8');

// Replace remaining Prisma calls with MongoDB equivalents
const replacements = [
  // Change password section
  {
    from: `  const user = await prisma.user.findUnique({
    where: { id: req.user!.id }
  });`,
    to: `  const usersCollection = getUsersCollection();
  const user = await usersCollection.findOne({ _id: req.user!.id });`
  },
  {
    from: `  await prisma.user.update({
    where: { id: req.user!.id },
    data: {
      password: hashedPassword,
      updatedAt: new Date()
    }
  });`,
    to: `  await usersCollection.updateOne(
    { _id: req.user!.id },
    { $set: { password: hashedPassword, updatedAt: new Date() } }
  );`
  },
  // Email verification section
  {
    from: `  const user = await prisma.user.findFirst({
    where: {
      emailVerificationToken: token,
      emailVerificationExpires: {
        gt: new Date()
      }
    }
  });`,
    to: `  const usersCollection = getUsersCollection();
  const user = await usersCollection.findOne({
    emailVerificationToken: token,
    emailVerificationExpires: { $gt: new Date() }
  });`
  },
  {
    from: `  await prisma.user.update({
    where: { id: user.id },
    data: {
      emailVerified: true,
      status: 'ACTIVE',
      emailVerificationToken: null,
      emailVerificationExpires: null,
      updatedAt: new Date()
    }
  });`,
    to: `  await usersCollection.updateOne(
    { _id: user._id },
    { 
      $set: { 
        emailVerified: true, 
        status: 'ACTIVE', 
        emailVerificationToken: null, 
        emailVerificationExpires: null, 
        updatedAt: new Date() 
      } 
    }
  );`
  },
  // Resend verification section
  {
    from: `  const user = await prisma.user.findUnique({
    where: { email }
  });`,
    to: `  const usersCollection = getUsersCollection();
  const user = await usersCollection.findOne({ email });`
  },
  {
    from: `  await prisma.user.update({
    where: { id: user.id },
    data: {
      emailVerificationToken: newToken,
      emailVerificationExpires: newExpiry,
      updatedAt: new Date()
    }
  });`,
    to: `  await usersCollection.updateOne(
    { _id: user._id },
    { 
      $set: { 
        emailVerificationToken: newToken, 
        emailVerificationExpires: newExpiry, 
        updatedAt: new Date() 
      } 
    }
  );`
  },
  // Admin user creation section
  {
    from: `  const existingUser = await prisma.user.findUnique({
    where: { email }
  });`,
    to: `  const usersCollection = getUsersCollection();
  const existingUser = await usersCollection.findOne({ email });`
  },
  {
    from: `  const user = await prisma.user.create({
    data: {
      email,
      password: hashedPassword,
      userType,
      status: 'ACTIVE',
      companyName,
      contactPerson,
      phone,
      address,
      businessRegistration,
      taxId,
      emailVerified: true
    },
    select: {
      id: true,
      email: true,
      userType: true,
      status: true,
      companyName: true,
      contactPerson: true,
      createdAt: true
    }
  });`,
    to: `  const userData = {
    email,
    password: hashedPassword,
    userType,
    status: 'ACTIVE',
    companyName,
    contactPerson,
    phone,
    address,
    businessRegistration,
    taxId,
    emailVerified: true,
    createdAt: new Date(),
    updatedAt: new Date()
  };

  const result = await usersCollection.insertOne(userData);
  const user = { ...userData, _id: result.insertedId };`
  }
];

// Apply all replacements
replacements.forEach(replacement => {
  content = content.replace(replacement.from, replacement.to);
});

// Write the updated content back
fs.writeFileSync(authPath, content);
console.log('✅ Fixed all remaining Prisma calls in auth.ts');
