┌──(patrics㉿kali)-[~/Desktop/INCLUDES/PROJECTS/school-fees-system/backend]
└─$ npm run db:seed

> backend@1.0.0 db:seed
> node prisma/seed.js

Seeding database...
Platform created
School created
Classes created
Admin created - email: admin@stpeters.mw | password: Admin@2025
Bursar created - email: bursar@stpeters.mw | password: Bursar@2025
Test students created

================================
Seed complete!

School: St Peters Private School
Admin login: admin@stpeters.mw / Admin@2025
Bursar login: bursar@stpeters.mw / Bursar@2025

Test Students:

- John Banda | ID: STP-2025-001 | DOB: 1010-03-15
- # Grace Phiri | ID: STP-2025-002 | DOB: 2009-07-22

┌──(patrics㉿kali)-[~/Desktop/INCLUDES/PROJECTS/school-fees-system/backend]
└─$

curl -X POST http://localhost:5000/api/auth/staff/login \
 -H "Content-Type: application/json" \
 -d '{"email":"admin@stpeters.mw","password":"Admin@2025"}'
