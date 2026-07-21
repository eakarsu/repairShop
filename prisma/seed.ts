import { PrismaClient, UserRole, TicketStatus, Priority, WarrantyStatus, OrderStatus, QuoteStatus, PaymentMethod, PaymentStatus, CommunicationType, CommunicationDirection, WarrantyClaimStatus, AutoOrderStatus, ApprovalStatus } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function clearDatabase() {
  console.log('Clearing existing data...')
  // Delete in order to respect foreign key constraints
  await prisma.warrantyDocument.deleteMany({})
  await prisma.warrantyClaimStatusHistory.deleteMany({})
  await prisma.warrantyClaim.deleteMany({})
  await prisma.quoteApproval.deleteMany({})
  await prisma.saleItem.deleteMany({})
  await prisma.sale.deleteMany({})
  await prisma.quoteItem.deleteMany({})
  await prisma.quote.deleteMany({})
  await prisma.orderItem.deleteMany({})
  await prisma.order.deleteMany({})
  await prisma.autoOrderLog.deleteMany({})
  await prisma.autoOrderRule.deleteMany({})
  await prisma.ticketPart.deleteMany({})
  await prisma.ticketPhoto.deleteMany({})
  await prisma.aiDiagnosticMessage.deleteMany({})
  await prisma.aiDiagnosticSession.deleteMany({})
  await prisma.ticketStatusHistory.deleteMany({})
  await prisma.communicationLog.deleteMany({})
  await prisma.repairTicket.deleteMany({})
  await prisma.device.deleteMany({})
  await prisma.customer.deleteMany({})
  await prisma.part.deleteMany({})
  await prisma.service.deleteMany({})
  await prisma.category.deleteMany({})
  await prisma.vendor.deleteMany({})
  await prisma.passwordResetToken.deleteMany({})
  await prisma.user.deleteMany({})
  await prisma.setting.deleteMany({})
  console.log('Database cleared!')
}

async function main() {
  if (process.env.ALLOW_DISPOSABLE_SEED !== 'YES') throw new Error('Refusing destructive seed; set ALLOW_DISPOSABLE_SEED=YES only for a disposable database')
  const seedEmail = String(process.env.SEED_ADMIN_EMAIL || '').trim().toLowerCase()
  const seedPassword = String(process.env.SEED_ADMIN_PASSWORD || '')
  if (!seedEmail || seedPassword.length < 16) throw new Error('SEED_ADMIN_EMAIL and a SEED_ADMIN_PASSWORD of at least 16 characters are required')
  console.log('Starting seed...')

  // Clear existing data first
  await clearDatabase()

  // Create Settings
  const settings = [
    { key: 'shop_name', value: 'TechFix Pro Repair Shop', description: 'Shop name' },
    { key: 'shop_address', value: '123 Main Street, Suite 100', description: 'Shop address' },
    { key: 'shop_city', value: 'San Francisco', description: 'Shop city' },
    { key: 'shop_state', value: 'CA', description: 'Shop state' },
    { key: 'shop_zip', value: '94102', description: 'Shop ZIP code' },
    { key: 'shop_phone', value: '(415) 555-0123', description: 'Shop phone' },
    { key: 'shop_email', value: 'info@techfixpro.com', description: 'Shop email' },
    { key: 'tax_rate', value: '8.625', description: 'Tax rate percentage' },
    { key: 'currency', value: 'USD', description: 'Currency code' },
    { key: 'ticket_prefix', value: 'TKT', description: 'Ticket number prefix' },
    { key: 'quote_prefix', value: 'QT', description: 'Quote number prefix' },
    { key: 'sale_prefix', value: 'INV', description: 'Sale/Invoice number prefix' },
    { key: 'order_prefix', value: 'PO', description: 'Purchase order number prefix' },
  ]

  for (const setting of settings) {
    await prisma.setting.upsert({
      where: { key: setting.key },
      update: { value: setting.value },
      create: setting,
    })
  }
  console.log('Settings created')

  // Create Users (6 users)
  const hashedPassword = await bcrypt.hash(seedPassword, 10)

  const users = await Promise.all([
    prisma.user.upsert({
      where: { email: seedEmail },
      update: {},
      create: { email: seedEmail, password: hashedPassword, firstName: 'RepairShop', lastName: 'Operator', role: UserRole.ADMIN, phone: '(415) 555-0001', emailVerified: true },
    }),
    prisma.user.upsert({
      where: { email: 'manager@techfixpro.com' },
      update: {},
      create: { email: 'manager@techfixpro.com', password: hashedPassword, firstName: 'Sarah', lastName: 'Manager', role: UserRole.MANAGER, phone: '(415) 555-0002', emailVerified: true },
    }),
    prisma.user.upsert({
      where: { email: 'mike@techfixpro.com' },
      update: {},
      create: { email: 'mike@techfixpro.com', password: hashedPassword, firstName: 'Mike', lastName: 'Technician', role: UserRole.TECHNICIAN, phone: '(415) 555-0003', emailVerified: true },
    }),
    prisma.user.upsert({
      where: { email: 'lisa@techfixpro.com' },
      update: {},
      create: { email: 'lisa@techfixpro.com', password: hashedPassword, firstName: 'Lisa', lastName: 'Chen', role: UserRole.TECHNICIAN, phone: '(415) 555-0004', emailVerified: true },
    }),
    prisma.user.upsert({
      where: { email: 'david@techfixpro.com' },
      update: {},
      create: { email: 'david@techfixpro.com', password: hashedPassword, firstName: 'David', lastName: 'Park', role: UserRole.TECHNICIAN, phone: '(415) 555-0006', emailVerified: true },
    }),
    prisma.user.upsert({
      where: { email: 'reception@techfixpro.com' },
      update: {},
      create: { email: 'reception@techfixpro.com', password: hashedPassword, firstName: 'Emily', lastName: 'Receptionist', role: UserRole.RECEPTIONIST, phone: '(415) 555-0005', emailVerified: true },
    }),
  ])
  console.log('Users created:', users.length)

  // Create 15 Categories
  const categoryNames = [
    { name: 'Phone Screens', description: 'Mobile phone screen replacements' },
    { name: 'Phone Batteries', description: 'Mobile phone batteries' },
    { name: 'Laptop Parts', description: 'Laptop replacement parts' },
    { name: 'Tablet Parts', description: 'Tablet replacement parts' },
    { name: 'Cables & Connectors', description: 'Various cables and connectors' },
    { name: 'Tools & Equipment', description: 'Repair tools and equipment' },
    { name: 'Accessories', description: 'Phone and tablet accessories' },
    { name: 'Shoe Parts', description: 'Shoe repair materials' },
    { name: 'Charging Components', description: 'Chargers and charging ports' },
    { name: 'Audio Components', description: 'Speakers and microphones' },
    { name: 'Camera Parts', description: 'Camera modules and lenses' },
    { name: 'Logic Boards', description: 'Motherboards and logic boards' },
    { name: 'Display Components', description: 'LCD and OLED displays' },
    { name: 'Storage', description: 'SSDs, HDDs, and memory' },
    { name: 'Buttons & Switches', description: 'Power buttons, volume buttons' },
  ]

  const categories = await Promise.all(
    categoryNames.map((cat) =>
      prisma.category.upsert({
        where: { name: cat.name },
        update: {},
        create: cat,
      })
    )
  )
  console.log('Categories created:', categories.length)

  // Create 15 Vendors
  const vendorData = [
    { id: 'v1', name: 'MobileParts Pro', contactName: 'Tom Wilson', email: 'tom@mobileparts.com', phone: '(800) 555-0100', address: '456 Tech Blvd, Los Angeles, CA 90001' },
    { id: 'v2', name: 'iFixit Supply', contactName: 'Jane Doe', email: 'jane@ifixitsupply.com', phone: '(800) 555-0200', address: '789 Repair Way, San Jose, CA 95110' },
    { id: 'v3', name: 'TechWholesale Inc', contactName: 'Bob Smith', email: 'bob@techwholesale.com', phone: '(800) 555-0300', address: '321 Component St, Seattle, WA 98101' },
    { id: 'v4', name: 'Shoe Supply Co', contactName: 'Maria Garcia', email: 'maria@shoesupply.com', phone: '(800) 555-0400', address: '555 Leather Lane, Boston, MA 02101' },
    { id: 'v5', name: 'DisplayTech Global', contactName: 'Chris Lee', email: 'chris@displaytech.com', phone: '(800) 555-0500', address: '100 Screen Ave, Austin, TX 78701' },
    { id: 'v6', name: 'Battery World', contactName: 'Anna Kim', email: 'anna@batteryworld.com', phone: '(800) 555-0600', address: '200 Power St, Denver, CO 80201' },
    { id: 'v7', name: 'Parts Express', contactName: 'Mike Brown', email: 'mike@partsexpress.com', phone: '(800) 555-0700', address: '300 Fast Lane, Phoenix, AZ 85001' },
    { id: 'v8', name: 'Global Electronics', contactName: 'Sarah Johnson', email: 'sarah@globalelec.com', phone: '(800) 555-0800', address: '400 Circuit Rd, Miami, FL 33101' },
    { id: 'v9', name: 'Premium Parts Co', contactName: 'David Chen', email: 'david@premiumparts.com', phone: '(800) 555-0900', address: '500 Quality Blvd, Chicago, IL 60601' },
    { id: 'v10', name: 'Repair Depot', contactName: 'Lisa Wang', email: 'lisa@repairdepot.com', phone: '(800) 555-1000', address: '600 Fix It Dr, Portland, OR 97201' },
    { id: 'v11', name: 'Component Central', contactName: 'James Miller', email: 'james@componentcentral.com', phone: '(800) 555-1100', address: '700 Parts Way, Dallas, TX 75201' },
    { id: 'v12', name: 'Tech Solutions Ltd', contactName: 'Emily Davis', email: 'emily@techsolutions.com', phone: '(800) 555-1200', address: '800 Tech Park, Atlanta, GA 30301' },
    { id: 'v13', name: 'OEM Parts Direct', contactName: 'Robert Taylor', email: 'robert@oemparts.com', phone: '(800) 555-1300', address: '900 Original St, San Diego, CA 92101' },
    { id: 'v14', name: 'Aftermarket Plus', contactName: 'Jennifer White', email: 'jennifer@aftermarket.com', phone: '(800) 555-1400', address: '1000 Value Ave, Las Vegas, NV 89101' },
    { id: 'v15', name: 'Shoe Craft Supplies', contactName: 'Carlos Rodriguez', email: 'carlos@shoecraft.com', phone: '(800) 555-1500', address: '1100 Cobbler Lane, New York, NY 10001' },
  ]

  const vendors = await Promise.all(
    vendorData.map((v) =>
      prisma.vendor.upsert({
        where: { id: v.id },
        update: {},
        create: v,
      })
    )
  )
  console.log('Vendors created:', vendors.length)

  // Create 30+ Parts
  const partsData = [
    { sku: 'SCR-IPH15PM', name: 'iPhone 15 Pro Max Screen', categoryIdx: 0, costPrice: 85, sellingPrice: 199, quantity: 25, vendorIdx: 0 },
    { sku: 'SCR-IPH14P', name: 'iPhone 14 Pro Screen', categoryIdx: 0, costPrice: 75, sellingPrice: 179, quantity: 30, vendorIdx: 0 },
    { sku: 'SCR-IPH13', name: 'iPhone 13 Screen', categoryIdx: 0, costPrice: 55, sellingPrice: 149, quantity: 35, vendorIdx: 0 },
    { sku: 'SCR-IPH12', name: 'iPhone 12 Screen', categoryIdx: 0, costPrice: 45, sellingPrice: 129, quantity: 40, vendorIdx: 0 },
    { sku: 'SCR-SGS24U', name: 'Samsung S24 Ultra Screen', categoryIdx: 0, costPrice: 95, sellingPrice: 219, quantity: 15, vendorIdx: 4 },
    { sku: 'SCR-SGS23', name: 'Samsung S23 Screen', categoryIdx: 0, costPrice: 75, sellingPrice: 179, quantity: 20, vendorIdx: 4 },
    { sku: 'SCR-PXL8', name: 'Google Pixel 8 Screen', categoryIdx: 0, costPrice: 65, sellingPrice: 159, quantity: 18, vendorIdx: 4 },
    { sku: 'BAT-IPH15', name: 'iPhone 15 Battery', categoryIdx: 1, costPrice: 15, sellingPrice: 49, quantity: 50, vendorIdx: 5 },
    { sku: 'BAT-IPH14', name: 'iPhone 14 Battery', categoryIdx: 1, costPrice: 14, sellingPrice: 45, quantity: 55, vendorIdx: 5 },
    { sku: 'BAT-IPH13', name: 'iPhone 13 Battery', categoryIdx: 1, costPrice: 12, sellingPrice: 39, quantity: 60, vendorIdx: 5 },
    { sku: 'BAT-SGS24', name: 'Samsung S24 Battery', categoryIdx: 1, costPrice: 18, sellingPrice: 55, quantity: 40, vendorIdx: 5 },
    { sku: 'BAT-SGS23', name: 'Samsung S23 Battery', categoryIdx: 1, costPrice: 16, sellingPrice: 49, quantity: 45, vendorIdx: 5 },
    { sku: 'KBD-MBP14', name: 'MacBook Pro 14" Keyboard', categoryIdx: 2, costPrice: 120, sellingPrice: 249, quantity: 10, vendorIdx: 2 },
    { sku: 'KBD-MBP16', name: 'MacBook Pro 16" Keyboard', categoryIdx: 2, costPrice: 130, sellingPrice: 269, quantity: 8, vendorIdx: 2 },
    { sku: 'SSD-512', name: '512GB NVMe SSD', categoryIdx: 13, costPrice: 45, sellingPrice: 89, quantity: 35, vendorIdx: 2 },
    { sku: 'SSD-1TB', name: '1TB NVMe SSD', categoryIdx: 13, costPrice: 75, sellingPrice: 139, quantity: 25, vendorIdx: 2 },
    { sku: 'CHG-IPH', name: 'iPhone Charging Port', categoryIdx: 8, costPrice: 8, sellingPrice: 29, quantity: 70, vendorIdx: 6 },
    { sku: 'CHG-USBC', name: 'USB-C Charging Port', categoryIdx: 8, costPrice: 10, sellingPrice: 35, quantity: 65, vendorIdx: 6 },
    { sku: 'SPK-IPH', name: 'iPhone Speaker', categoryIdx: 9, costPrice: 12, sellingPrice: 39, quantity: 45, vendorIdx: 7 },
    { sku: 'MIC-IPH', name: 'iPhone Microphone', categoryIdx: 9, costPrice: 8, sellingPrice: 29, quantity: 50, vendorIdx: 7 },
    { sku: 'CAM-IPH15', name: 'iPhone 15 Camera Module', categoryIdx: 10, costPrice: 65, sellingPrice: 149, quantity: 15, vendorIdx: 12 },
    { sku: 'CAM-IPH14', name: 'iPhone 14 Camera Module', categoryIdx: 10, costPrice: 55, sellingPrice: 129, quantity: 18, vendorIdx: 12 },
    { sku: 'ACC-SC20W', name: 'Screen Protector Pack', categoryIdx: 6, costPrice: 3, sellingPrice: 15, quantity: 100, vendorIdx: 13 },
    { sku: 'ACC-CASE', name: 'Phone Case - Various', categoryIdx: 6, costPrice: 5, sellingPrice: 25, quantity: 75, vendorIdx: 13 },
    { sku: 'ACC-CABLE', name: 'Lightning Cable', categoryIdx: 4, costPrice: 4, sellingPrice: 19, quantity: 80, vendorIdx: 6 },
    { sku: 'ACC-USBC', name: 'USB-C Cable', categoryIdx: 4, costPrice: 3, sellingPrice: 15, quantity: 90, vendorIdx: 6 },
    { sku: 'SH-SOLE-M', name: 'Replacement Sole - Men', categoryIdx: 7, costPrice: 8, sellingPrice: 25, quantity: 50, vendorIdx: 14 },
    { sku: 'SH-SOLE-W', name: 'Replacement Sole - Women', categoryIdx: 7, costPrice: 7, sellingPrice: 22, quantity: 45, vendorIdx: 14 },
    { sku: 'SH-HEEL', name: 'Heel Replacement', categoryIdx: 7, costPrice: 4, sellingPrice: 15, quantity: 60, vendorIdx: 14 },
    { sku: 'SH-LACES', name: 'Premium Shoe Laces', categoryIdx: 7, costPrice: 2, sellingPrice: 8, quantity: 100, vendorIdx: 14 },
    { sku: 'BTN-PWR', name: 'Power Button Flex', categoryIdx: 14, costPrice: 6, sellingPrice: 25, quantity: 55, vendorIdx: 7 },
    { sku: 'BTN-VOL', name: 'Volume Button Flex', categoryIdx: 14, costPrice: 5, sellingPrice: 22, quantity: 50, vendorIdx: 7 },
  ]

  const parts = await Promise.all(
    partsData.map((p) =>
      prisma.part.upsert({
        where: { sku: p.sku },
        update: {},
        create: {
          sku: p.sku,
          name: p.name,
          categoryId: categories[p.categoryIdx].id,
          costPrice: p.costPrice,
          sellingPrice: p.sellingPrice,
          quantity: p.quantity,
          minQuantity: 5,
          location: `Shelf ${String.fromCharCode(65 + p.categoryIdx)}${Math.floor(Math.random() * 5) + 1}`,
          vendorId: vendors[p.vendorIdx].id,
        },
      })
    )
  )
  console.log('Parts created:', parts.length)

  // Create 20 Services
  const servicesData = [
    { id: 'svc-screen', name: 'Screen Replacement', category: 'Phone Repair', basePrice: 49, estimatedTime: 45 },
    { id: 'svc-battery', name: 'Battery Replacement', category: 'Phone Repair', basePrice: 29, estimatedTime: 30 },
    { id: 'svc-diagnostic', name: 'Diagnostic Service', category: 'General', basePrice: 25, estimatedTime: 30 },
    { id: 'svc-water', name: 'Water Damage Repair', category: 'Phone Repair', basePrice: 79, estimatedTime: 120 },
    { id: 'svc-data', name: 'Data Recovery', category: 'General', basePrice: 99, estimatedTime: 180 },
    { id: 'svc-laptop-repair', name: 'Laptop Repair', category: 'Laptop Repair', basePrice: 75, estimatedTime: 90 },
    { id: 'svc-keyboard', name: 'Keyboard Replacement', category: 'Laptop Repair', basePrice: 59, estimatedTime: 60 },
    { id: 'svc-ssd', name: 'SSD Upgrade', category: 'Laptop Repair', basePrice: 45, estimatedTime: 45 },
    { id: 'svc-shoe-sole', name: 'Shoe Sole Replacement', category: 'Shoe Repair', basePrice: 35, estimatedTime: 60 },
    { id: 'svc-shoe-heel', name: 'Heel Repair', category: 'Shoe Repair', basePrice: 20, estimatedTime: 30 },
    { id: 'svc-shoe-clean', name: 'Shoe Cleaning & Conditioning', category: 'Shoe Repair', basePrice: 25, estimatedTime: 45 },
    { id: 'svc-charging', name: 'Charging Port Repair', category: 'Phone Repair', basePrice: 39, estimatedTime: 45 },
    { id: 'svc-speaker', name: 'Speaker Replacement', category: 'Phone Repair', basePrice: 35, estimatedTime: 30 },
    { id: 'svc-camera', name: 'Camera Repair', category: 'Phone Repair', basePrice: 55, estimatedTime: 60 },
    { id: 'svc-backglass', name: 'Back Glass Replacement', category: 'Phone Repair', basePrice: 45, estimatedTime: 45 },
    { id: 'svc-tablet-screen', name: 'Tablet Screen Repair', category: 'Tablet Repair', basePrice: 89, estimatedTime: 60 },
    { id: 'svc-tablet-battery', name: 'Tablet Battery Replacement', category: 'Tablet Repair', basePrice: 49, estimatedTime: 45 },
    { id: 'svc-software', name: 'Software Troubleshooting', category: 'General', basePrice: 35, estimatedTime: 30 },
    { id: 'svc-virus', name: 'Virus Removal', category: 'General', basePrice: 49, estimatedTime: 60 },
    { id: 'svc-os-install', name: 'OS Installation', category: 'General', basePrice: 59, estimatedTime: 90 },
  ]

  const services = await Promise.all(
    servicesData.map((s) =>
      prisma.service.upsert({
        where: { id: s.id },
        update: {},
        create: s,
      })
    )
  )
  console.log('Services created:', services.length)

  // Create 20 Customers
  const customersData = [
    { firstName: 'John', lastName: 'Smith', email: 'john.smith@email.com', phone: '(415) 555-1001', city: 'San Francisco', state: 'CA', zipCode: '94102' },
    { firstName: 'Mary', lastName: 'Johnson', email: 'mary.johnson@email.com', phone: '(415) 555-1002', city: 'San Francisco', state: 'CA', zipCode: '94103' },
    { firstName: 'Robert', lastName: 'Williams', email: 'robert.williams@email.com', phone: '(415) 555-1003', city: 'San Francisco', state: 'CA', zipCode: '94104' },
    { firstName: 'Jennifer', lastName: 'Brown', email: 'jennifer.brown@email.com', phone: '(415) 555-1004', city: 'Oakland', state: 'CA', zipCode: '94601' },
    { firstName: 'Michael', lastName: 'Davis', email: 'michael.davis@email.com', phone: '(415) 555-1005', city: 'Berkeley', state: 'CA', zipCode: '94701' },
    { firstName: 'Linda', lastName: 'Miller', email: 'linda.miller@email.com', phone: '(415) 555-1006', city: 'San Jose', state: 'CA', zipCode: '95101' },
    { firstName: 'David', lastName: 'Wilson', email: 'david.wilson@email.com', phone: '(415) 555-1007', city: 'Palo Alto', state: 'CA', zipCode: '94301' },
    { firstName: 'Patricia', lastName: 'Moore', email: 'patricia.moore@email.com', phone: '(415) 555-1008', city: 'Sunnyvale', state: 'CA', zipCode: '94086' },
    { firstName: 'James', lastName: 'Taylor', email: 'james.taylor@email.com', phone: '(415) 555-1009', city: 'Mountain View', state: 'CA', zipCode: '94040' },
    { firstName: 'Barbara', lastName: 'Anderson', email: 'barbara.anderson@email.com', phone: '(415) 555-1010', city: 'Santa Clara', state: 'CA', zipCode: '95050' },
    { firstName: 'Richard', lastName: 'Thomas', email: 'richard.thomas@email.com', phone: '(415) 555-1011', city: 'Fremont', state: 'CA', zipCode: '94536' },
    { firstName: 'Susan', lastName: 'Jackson', email: 'susan.jackson@email.com', phone: '(415) 555-1012', city: 'Hayward', state: 'CA', zipCode: '94541' },
    { firstName: 'Joseph', lastName: 'White', email: 'joseph.white@email.com', phone: '(415) 555-1013', city: 'Daly City', state: 'CA', zipCode: '94014' },
    { firstName: 'Jessica', lastName: 'Harris', email: 'jessica.harris@email.com', phone: '(415) 555-1014', city: 'Richmond', state: 'CA', zipCode: '94801' },
    { firstName: 'Thomas', lastName: 'Martin', email: 'thomas.martin@email.com', phone: '(415) 555-1015', city: 'Concord', state: 'CA', zipCode: '94520' },
    { firstName: 'Sarah', lastName: 'Garcia', email: 'sarah.garcia@email.com', phone: '(415) 555-1016', city: 'Walnut Creek', state: 'CA', zipCode: '94596' },
    { firstName: 'Charles', lastName: 'Martinez', email: 'charles.martinez@email.com', phone: '(415) 555-1017', city: 'Pleasanton', state: 'CA', zipCode: '94566' },
    { firstName: 'Karen', lastName: 'Robinson', email: 'karen.robinson@email.com', phone: '(415) 555-1018', city: 'Livermore', state: 'CA', zipCode: '94550' },
    { firstName: 'Daniel', lastName: 'Clark', email: 'daniel.clark@email.com', phone: '(415) 555-1019', city: 'San Mateo', state: 'CA', zipCode: '94401' },
    { firstName: 'Nancy', lastName: 'Lewis', email: 'nancy.lewis@email.com', phone: '(415) 555-1020', city: 'Redwood City', state: 'CA', zipCode: '94063' },
  ]

  const customers = await Promise.all(
    customersData.map((c) =>
      prisma.customer.upsert({
        where: { email: c.email },
        update: {},
        create: { ...c, address: `${Math.floor(Math.random() * 999) + 100} Main Street` },
      })
    )
  )
  console.log('Customers created:', customers.length)

  // Create 25 Devices
  const devicesData = [
    { customerIdx: 0, deviceType: 'Smartphone', brand: 'Apple', model: 'iPhone 15 Pro Max', serialNumber: 'DNQXK4LHPH', color: 'Natural Titanium' },
    { customerIdx: 0, deviceType: 'Laptop', brand: 'Apple', model: 'MacBook Pro 14', serialNumber: 'C02YK1PDLVCG', color: 'Space Gray' },
    { customerIdx: 1, deviceType: 'Smartphone', brand: 'Samsung', model: 'Galaxy S24 Ultra', serialNumber: 'R5CT91MXYZK', color: 'Titanium Black' },
    { customerIdx: 2, deviceType: 'Smartphone', brand: 'Apple', model: 'iPhone 14 Pro', serialNumber: 'F4GDKLH7VJCL', color: 'Deep Purple' },
    { customerIdx: 3, deviceType: 'Shoes', brand: 'Allen Edmonds', model: 'Park Avenue Oxford', color: 'Walnut' },
    { customerIdx: 4, deviceType: 'Tablet', brand: 'Apple', model: 'iPad Pro 12.9', serialNumber: 'DMPVT4ABCD', color: 'Silver' },
    { customerIdx: 5, deviceType: 'Smartphone', brand: 'Google', model: 'Pixel 8 Pro', serialNumber: 'G8PXYZ123', color: 'Porcelain' },
    { customerIdx: 6, deviceType: 'Laptop', brand: 'Dell', model: 'XPS 15', serialNumber: 'DXPS15ABC', color: 'Silver' },
    { customerIdx: 7, deviceType: 'Smartphone', brand: 'Apple', model: 'iPhone 13', serialNumber: 'IPH13XYZ789', color: 'Midnight' },
    { customerIdx: 8, deviceType: 'Shoes', brand: 'Nike', model: 'Air Max 90', color: 'White/Black' },
    { customerIdx: 9, deviceType: 'Tablet', brand: 'Samsung', model: 'Galaxy Tab S9', serialNumber: 'TABS9ABC', color: 'Graphite' },
    { customerIdx: 10, deviceType: 'Smartphone', brand: 'Apple', model: 'iPhone 12', serialNumber: 'IPH12DEF456', color: 'Blue' },
    { customerIdx: 11, deviceType: 'Laptop', brand: 'Apple', model: 'MacBook Air M2', serialNumber: 'MBAM2XYZ', color: 'Midnight' },
    { customerIdx: 12, deviceType: 'Smartphone', brand: 'Samsung', model: 'Galaxy S23', serialNumber: 'SGS23ABC', color: 'Cream' },
    { customerIdx: 13, deviceType: 'Shoes', brand: 'Cole Haan', model: 'Grand Crosscourt', color: 'Navy' },
    { customerIdx: 14, deviceType: 'Smartwatch', brand: 'Apple', model: 'Watch Series 9', serialNumber: 'AWS9XYZ', color: 'Midnight' },
    { customerIdx: 15, deviceType: 'Smartphone', brand: 'Apple', model: 'iPhone 15', serialNumber: 'IPH15ABC123', color: 'Pink' },
    { customerIdx: 16, deviceType: 'Laptop', brand: 'HP', model: 'Spectre x360', serialNumber: 'HPSX360ABC', color: 'Nightfall Black' },
    { customerIdx: 17, deviceType: 'Smartphone', brand: 'Google', model: 'Pixel 7', serialNumber: 'GPX7DEF456', color: 'Obsidian' },
    { customerIdx: 18, deviceType: 'Tablet', brand: 'Apple', model: 'iPad Air', serialNumber: 'IPAAIRXYZ', color: 'Space Gray' },
    { customerIdx: 19, deviceType: 'Shoes', brand: 'Clarks', model: 'Desert Boot', color: 'Beeswax' },
    { customerIdx: 0, deviceType: 'Smartwatch', brand: 'Apple', model: 'Watch Ultra 2', serialNumber: 'AWU2ABC', color: 'Titanium' },
    { customerIdx: 1, deviceType: 'Laptop', brand: 'Lenovo', model: 'ThinkPad X1 Carbon', serialNumber: 'TPX1CDEF', color: 'Black' },
    { customerIdx: 2, deviceType: 'Tablet', brand: 'Apple', model: 'iPad Mini', serialNumber: 'IPMINI123', color: 'Purple' },
    { customerIdx: 3, deviceType: 'Smartphone', brand: 'OnePlus', model: '12', serialNumber: 'OP12XYZ', color: 'Silky Black' },
  ]

  const devices = await Promise.all(
    devicesData.map((d) =>
      prisma.device.create({
        data: {
          customerId: customers[d.customerIdx].id,
          deviceType: d.deviceType,
          brand: d.brand,
          model: d.model,
          serialNumber: d.serialNumber,
          color: d.color,
          condition: 'Good',
        },
      })
    )
  )
  console.log('Devices created:', devices.length)

  // Helper function to create a date N days ago
  const daysAgo = (days: number) => new Date(Date.now() - days * 24 * 60 * 60 * 1000)

  // Create 25 Repair Tickets with historical dates
  const ticketsData = [
    { num: 'TKT-2024-0001', customerIdx: 0, deviceIdx: 0, issue: 'Screen cracked after drop. Touch not working.', status: TicketStatus.COMPLETED, priority: Priority.HIGH, techIdx: 2, daysAgo: 28, laborCost: 49, partsCost: 199 },
    { num: 'TKT-2024-0002', customerIdx: 1, deviceIdx: 2, issue: 'Battery drains quickly. Phone gets hot.', status: TicketStatus.COMPLETED, priority: Priority.NORMAL, techIdx: 2, daysAgo: 25, laborCost: 29, partsCost: 55 },
    { num: 'TKT-2024-0003', customerIdx: 2, deviceIdx: 3, issue: 'Phone dropped in water. Not turning on.', status: TicketStatus.COMPLETED, priority: Priority.URGENT, techIdx: 3, daysAgo: 22, laborCost: 79, partsCost: 0 },
    { num: 'TKT-2024-0004', customerIdx: 3, deviceIdx: 4, issue: 'Soles worn through. Need replacement.', status: TicketStatus.COMPLETED, priority: Priority.NORMAL, techIdx: 3, daysAgo: 20, laborCost: 35, partsCost: 25 },
    { num: 'TKT-2024-0005', customerIdx: 4, deviceIdx: 5, issue: 'Cracked screen. Still functional.', status: TicketStatus.COMPLETED, priority: Priority.LOW, techIdx: 2, daysAgo: 18, laborCost: 49, partsCost: 129 },
    { num: 'TKT-2024-0006', customerIdx: 5, deviceIdx: 6, issue: 'Camera not focusing properly.', status: TicketStatus.COMPLETED, priority: Priority.NORMAL, techIdx: 2, daysAgo: 16, laborCost: 55, partsCost: 149 },
    { num: 'TKT-2024-0007', customerIdx: 6, deviceIdx: 7, issue: 'Keyboard keys not responding.', status: TicketStatus.COMPLETED, priority: Priority.HIGH, techIdx: 3, daysAgo: 14, laborCost: 59, partsCost: 269 },
    { num: 'TKT-2024-0008', customerIdx: 7, deviceIdx: 8, issue: 'Charging port loose. Intermittent charging.', status: TicketStatus.COMPLETED, priority: Priority.NORMAL, techIdx: 2, daysAgo: 12, laborCost: 39, partsCost: 29 },
    { num: 'TKT-2024-0009', customerIdx: 8, deviceIdx: 9, issue: 'Heel worn down. Squeaking when walking.', status: TicketStatus.COMPLETED, priority: Priority.LOW, techIdx: 3, daysAgo: 10, laborCost: 20, partsCost: 15 },
    { num: 'TKT-2024-0010', customerIdx: 9, deviceIdx: 10, issue: 'Screen flickering randomly.', status: TicketStatus.COMPLETED, priority: Priority.HIGH, techIdx: 4, daysAgo: 9, laborCost: 49, partsCost: 179 },
    { num: 'TKT-2024-0011', customerIdx: 10, deviceIdx: 11, issue: 'Battery swelling. Device turning off.', status: TicketStatus.COMPLETED, priority: Priority.URGENT, techIdx: 2, daysAgo: 8, laborCost: 29, partsCost: 45 },
    { num: 'TKT-2024-0012', customerIdx: 11, deviceIdx: 12, issue: 'Trackpad not clicking properly.', status: TicketStatus.COMPLETED, priority: Priority.NORMAL, techIdx: 3, daysAgo: 7, laborCost: 45, partsCost: 0 },
    { num: 'TKT-2024-0013', customerIdx: 12, deviceIdx: 13, issue: 'Speaker crackling during calls.', status: TicketStatus.COMPLETED, priority: Priority.LOW, techIdx: 3, daysAgo: 6, laborCost: 35, partsCost: 39 },
    { num: 'TKT-2024-0014', customerIdx: 13, deviceIdx: 14, issue: 'Leather cracking. Needs reconditioning.', status: TicketStatus.COMPLETED, priority: Priority.NORMAL, techIdx: 3, daysAgo: 5, laborCost: 25, partsCost: 0 },
    { num: 'TKT-2024-0015', customerIdx: 14, deviceIdx: 15, issue: 'Watch face scratched. Battery dying fast.', status: TicketStatus.COMPLETED, priority: Priority.HIGH, techIdx: 4, daysAgo: 4, laborCost: 49, partsCost: 0 },
    { num: 'TKT-2024-0016', customerIdx: 15, deviceIdx: 16, issue: 'Face ID not working.', status: TicketStatus.READY_PICKUP, priority: Priority.NORMAL, techIdx: 2, daysAgo: 3, laborCost: 55, partsCost: 0 },
    { num: 'TKT-2024-0017', customerIdx: 16, deviceIdx: 17, issue: 'Fan making loud noise.', status: TicketStatus.IN_REPAIR, priority: Priority.NORMAL, techIdx: 4, daysAgo: 3, laborCost: null, partsCost: null },
    { num: 'TKT-2024-0018', customerIdx: 17, deviceIdx: 18, issue: 'Fingerprint sensor not working.', status: TicketStatus.QUALITY_CHECK, priority: Priority.LOW, techIdx: 3, daysAgo: 2, laborCost: 39, partsCost: 0 },
    { num: 'TKT-2024-0019', customerIdx: 18, deviceIdx: 19, issue: 'Screen cracked in corner. Touch works.', status: TicketStatus.WAITING_PARTS, priority: Priority.NORMAL, techIdx: 2, daysAgo: 2, laborCost: null, partsCost: null },
    { num: 'TKT-2024-0020', customerIdx: 19, deviceIdx: 20, issue: 'Stitching coming undone on sides.', status: TicketStatus.DIAGNOSING, priority: Priority.LOW, techIdx: 3, daysAgo: 1, laborCost: null, partsCost: null },
    { num: 'TKT-2024-0021', customerIdx: 0, deviceIdx: 1, issue: 'SSD running slow. Needs upgrade.', status: TicketStatus.RECEIVED, priority: Priority.NORMAL, techIdx: null, daysAgo: 1, laborCost: null, partsCost: null },
    { num: 'TKT-2024-0022', customerIdx: 1, deviceIdx: 22, issue: 'Laptop overheating during use.', status: TicketStatus.DIAGNOSING, priority: Priority.HIGH, techIdx: 4, daysAgo: 1, laborCost: null, partsCost: null },
    { num: 'TKT-2024-0023', customerIdx: 2, deviceIdx: 23, issue: 'Touch screen not responding in corners.', status: TicketStatus.WAITING_APPROVAL, priority: Priority.NORMAL, techIdx: 2, daysAgo: 0, laborCost: null, partsCost: null },
    { num: 'TKT-2024-0024', customerIdx: 3, deviceIdx: 24, issue: 'Phone not charging wirelessly.', status: TicketStatus.RECEIVED, priority: Priority.LOW, techIdx: null, daysAgo: 0, laborCost: null, partsCost: null },
    { num: 'TKT-2024-0025', customerIdx: 4, deviceIdx: 5, issue: 'Power button stuck.', status: TicketStatus.RECEIVED, priority: Priority.NORMAL, techIdx: null, daysAgo: 0, laborCost: null, partsCost: null },
  ]

  const tickets = await Promise.all(
    ticketsData.map((t) =>
      prisma.repairTicket.create({
        data: {
          ticketNumber: t.num,
          customerId: customers[t.customerIdx].id,
          deviceId: devices[t.deviceIdx].id,
          issueDescription: t.issue,
          status: t.status,
          priority: t.priority,
          technicianId: t.techIdx !== null ? users[t.techIdx].id : null,
          createdById: users[5].id,
          laborCost: t.laborCost,
          partsCost: t.partsCost,
          intakeDate: daysAgo(t.daysAgo),
          completedDate: t.status === TicketStatus.COMPLETED ? daysAgo(Math.max(0, t.daysAgo - 2)) : null,
        },
      })
    )
  )
  console.log('Tickets created:', tickets.length)

  // Create Status History for tickets
  for (const ticket of tickets) {
    await prisma.ticketStatusHistory.create({
      data: { ticketId: ticket.id, toStatus: TicketStatus.RECEIVED },
    })
  }
  console.log('Status history created')

  // Create 20 Communications
  const commData = [
    { customerIdx: 0, ticketIdx: 0, type: CommunicationType.PHONE, direction: CommunicationDirection.INBOUND, subject: 'Initial Call', content: 'Customer called about cracked screen.' },
    { customerIdx: 0, ticketIdx: 0, type: CommunicationType.SMS, direction: CommunicationDirection.OUTBOUND, subject: 'Status Update', content: 'Your iPhone screen replacement is in progress.' },
    { customerIdx: 1, ticketIdx: 1, type: CommunicationType.EMAIL, direction: CommunicationDirection.OUTBOUND, subject: 'Quote Approval', content: 'Please review and approve the attached quote.' },
    { customerIdx: 2, ticketIdx: 2, type: CommunicationType.PHONE, direction: CommunicationDirection.INBOUND, subject: 'Water Damage', content: 'Customer dropped phone in pool yesterday.' },
    { customerIdx: 3, ticketIdx: 3, type: CommunicationType.SMS, direction: CommunicationDirection.OUTBOUND, subject: 'Ready for Pickup', content: 'Your shoes are ready for pickup!' },
    { customerIdx: 4, ticketIdx: 4, type: CommunicationType.NOTE, direction: CommunicationDirection.OUTBOUND, subject: 'Initial Assessment', content: 'Screen damage appears minor. May be able to repair.' },
    { customerIdx: 5, ticketIdx: 5, type: CommunicationType.PHONE, direction: CommunicationDirection.INBOUND, subject: 'Camera Issue', content: 'Customer reports blurry photos.' },
    { customerIdx: 6, ticketIdx: 6, type: CommunicationType.EMAIL, direction: CommunicationDirection.OUTBOUND, subject: 'Parts Ordered', content: 'Keyboard part has been ordered.' },
    { customerIdx: 7, ticketIdx: 7, type: CommunicationType.SMS, direction: CommunicationDirection.OUTBOUND, subject: 'Repair Complete', content: 'Charging port fixed. Quality check in progress.' },
    { customerIdx: 8, ticketIdx: 8, type: CommunicationType.PHONE, direction: CommunicationDirection.OUTBOUND, subject: 'Pickup Reminder', content: 'Called to remind about pickup.' },
    { customerIdx: 9, ticketIdx: 9, type: CommunicationType.NOTE, direction: CommunicationDirection.OUTBOUND, subject: 'Diagnosis', content: 'Screen connector may be loose.' },
    { customerIdx: 10, ticketIdx: 10, type: CommunicationType.SMS, direction: CommunicationDirection.OUTBOUND, subject: 'Urgent Update', content: 'Battery being replaced urgently.' },
    { customerIdx: 11, ticketIdx: 11, type: CommunicationType.EMAIL, direction: CommunicationDirection.INBOUND, subject: 'Inquiry', content: 'Customer asking about repair timeline.' },
    { customerIdx: 12, ticketIdx: 12, type: CommunicationType.PHONE, direction: CommunicationDirection.INBOUND, subject: 'Quote Request', content: 'Customer wants quote for speaker repair.' },
    { customerIdx: 13, ticketIdx: 13, type: CommunicationType.NOTE, direction: CommunicationDirection.OUTBOUND, subject: 'Leather Care', content: 'Applying leather conditioner treatment.' },
    { customerIdx: 14, ticketIdx: 14, type: CommunicationType.SMS, direction: CommunicationDirection.OUTBOUND, subject: 'Almost Done', content: 'Watch repair almost complete.' },
    { customerIdx: 15, ticketIdx: 15, type: CommunicationType.PHONE, direction: CommunicationDirection.INBOUND, subject: 'Face ID Issue', content: 'Customer explained Face ID stopped working.' },
    { customerIdx: 16, ticketIdx: 16, type: CommunicationType.EMAIL, direction: CommunicationDirection.OUTBOUND, subject: 'Diagnostic Results', content: 'Fan needs replacement. Quote attached.' },
    { customerIdx: 17, ticketIdx: 17, type: CommunicationType.NOTE, direction: CommunicationDirection.OUTBOUND, subject: 'Sensor Check', content: 'Testing fingerprint sensor calibration.' },
    { customerIdx: 18, ticketIdx: 18, type: CommunicationType.SMS, direction: CommunicationDirection.OUTBOUND, subject: 'Ready', content: 'Your iPad is ready for pickup.' },
  ]

  await Promise.all(
    commData.map((c) =>
      prisma.communicationLog.create({
        data: {
          customerId: customers[c.customerIdx].id,
          ticketId: tickets[c.ticketIdx].id,
          userId: users[5].id,
          type: c.type,
          direction: c.direction,
          subject: c.subject,
          content: c.content,
        },
      })
    )
  )
  console.log('Communications created:', commData.length)

  // Create 15 Purchase Orders
  const ordersData = [
    { num: 'PO-2024-0001', vendorIdx: 0, status: OrderStatus.RECEIVED, parts: [{ idx: 0, qty: 10 }, { idx: 1, qty: 10 }] },
    { num: 'PO-2024-0002', vendorIdx: 5, status: OrderStatus.SHIPPED, parts: [{ idx: 7, qty: 20 }, { idx: 8, qty: 20 }] },
    { num: 'PO-2024-0003', vendorIdx: 2, status: OrderStatus.ORDERED, parts: [{ idx: 12, qty: 5 }, { idx: 14, qty: 10 }] },
    { num: 'PO-2024-0004', vendorIdx: 14, status: OrderStatus.PENDING, parts: [{ idx: 26, qty: 25 }, { idx: 28, qty: 30 }] },
    { num: 'PO-2024-0005', vendorIdx: 4, status: OrderStatus.RECEIVED, parts: [{ idx: 4, qty: 8 }, { idx: 5, qty: 10 }] },
    { num: 'PO-2024-0006', vendorIdx: 6, status: OrderStatus.SHIPPED, parts: [{ idx: 16, qty: 30 }, { idx: 17, qty: 25 }] },
    { num: 'PO-2024-0007', vendorIdx: 7, status: OrderStatus.ORDERED, parts: [{ idx: 18, qty: 20 }, { idx: 19, qty: 25 }] },
    { num: 'PO-2024-0008', vendorIdx: 12, status: OrderStatus.PENDING, parts: [{ idx: 20, qty: 10 }, { idx: 21, qty: 12 }] },
    { num: 'PO-2024-0009', vendorIdx: 13, status: OrderStatus.RECEIVED, parts: [{ idx: 22, qty: 50 }, { idx: 23, qty: 40 }] },
    { num: 'PO-2024-0010', vendorIdx: 0, status: OrderStatus.SHIPPED, parts: [{ idx: 2, qty: 15 }, { idx: 3, qty: 20 }] },
    { num: 'PO-2024-0011', vendorIdx: 5, status: OrderStatus.ORDERED, parts: [{ idx: 9, qty: 30 }, { idx: 10, qty: 25 }] },
    { num: 'PO-2024-0012', vendorIdx: 2, status: OrderStatus.PENDING, parts: [{ idx: 13, qty: 5 }, { idx: 15, qty: 15 }] },
    { num: 'PO-2024-0013', vendorIdx: 6, status: OrderStatus.RECEIVED, parts: [{ idx: 24, qty: 40 }, { idx: 25, qty: 50 }] },
    { num: 'PO-2024-0014', vendorIdx: 7, status: OrderStatus.SHIPPED, parts: [{ idx: 30, qty: 30 }, { idx: 31, qty: 25 }] },
    { num: 'PO-2024-0015', vendorIdx: 14, status: OrderStatus.ORDERED, parts: [{ idx: 27, qty: 20 }, { idx: 29, qty: 50 }] },
  ]

  const orders = await Promise.all(
    ordersData.map(async (o) => {
      const items = o.parts.map((p) => ({
        partId: parts[p.idx].id,
        quantity: p.qty,
        unitPrice: parts[p.idx].costPrice,
      }))
      const totalAmount = items.reduce((sum, i) => sum + i.quantity * i.unitPrice, 0)

      return prisma.order.create({
        data: {
          orderNumber: o.num,
          vendorId: vendors[o.vendorIdx].id,
          status: o.status,
          totalAmount,
          expectedDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          receivedDate: o.status === OrderStatus.RECEIVED ? new Date() : null,
          items: { create: items },
        },
      })
    })
  )
  console.log('Orders created:', orders.length)

  // Create 15 Quotes
  const quotesData = [
    { num: 'QT-2024-0001', customerIdx: 1, ticketIdx: 1, status: QuoteStatus.SENT, items: [{ svcIdx: 1, desc: 'Battery Replacement', price: 29 }, { desc: 'Samsung S24 Battery', price: 55 }] },
    { num: 'QT-2024-0002', customerIdx: 2, ticketIdx: 2, status: QuoteStatus.DRAFT, items: [{ svcIdx: 3, desc: 'Water Damage Repair', price: 79 }] },
    { num: 'QT-2024-0003', customerIdx: 4, ticketIdx: 4, status: QuoteStatus.APPROVED, items: [{ svcIdx: 0, desc: 'Screen Replacement', price: 49 }, { desc: 'iPad Screen', price: 129 }] },
    { num: 'QT-2024-0004', customerIdx: 5, ticketIdx: 5, status: QuoteStatus.SENT, items: [{ svcIdx: 13, desc: 'Camera Repair', price: 55 }, { desc: 'Camera Module', price: 149 }] },
    { num: 'QT-2024-0005', customerIdx: 6, ticketIdx: 6, status: QuoteStatus.APPROVED, items: [{ svcIdx: 6, desc: 'Keyboard Replacement', price: 59 }, { desc: 'MacBook Keyboard', price: 269 }] },
    { num: 'QT-2024-0006', customerIdx: 7, ticketIdx: 7, status: QuoteStatus.SENT, items: [{ svcIdx: 11, desc: 'Charging Port Repair', price: 39 }, { desc: 'Charging Port', price: 29 }] },
    { num: 'QT-2024-0007', customerIdx: 9, ticketIdx: 9, status: QuoteStatus.APPROVED, items: [{ svcIdx: 15, desc: 'Tablet Screen Repair', price: 89 }, { desc: 'Screen', price: 159 }] },
    { num: 'QT-2024-0008', customerIdx: 10, ticketIdx: 10, status: QuoteStatus.REJECTED, items: [{ svcIdx: 1, desc: 'Battery Replacement', price: 29 }, { desc: 'Battery', price: 45 }] },
    { num: 'QT-2024-0009', customerIdx: 12, ticketIdx: 12, status: QuoteStatus.SENT, items: [{ svcIdx: 12, desc: 'Speaker Replacement', price: 35 }, { desc: 'Speaker', price: 39 }] },
    { num: 'QT-2024-0010', customerIdx: 13, ticketIdx: 13, status: QuoteStatus.DRAFT, items: [{ svcIdx: 10, desc: 'Shoe Cleaning', price: 25 }] },
    { num: 'QT-2024-0011', customerIdx: 14, ticketIdx: 14, status: QuoteStatus.APPROVED, items: [{ svcIdx: 1, desc: 'Battery Replacement', price: 29 }] },
    { num: 'QT-2024-0012', customerIdx: 15, ticketIdx: 15, status: QuoteStatus.SENT, items: [{ svcIdx: 2, desc: 'Diagnostic Service', price: 25 }] },
    { num: 'QT-2024-0013', customerIdx: 16, ticketIdx: 16, status: QuoteStatus.EXPIRED, items: [{ svcIdx: 5, desc: 'Laptop Repair', price: 75 }] },
    { num: 'QT-2024-0014', customerIdx: 17, ticketIdx: 17, status: QuoteStatus.SENT, items: [{ svcIdx: 2, desc: 'Diagnostic', price: 25 }, { svcIdx: 11, desc: 'Sensor Repair', price: 39 }] },
    { num: 'QT-2024-0015', customerIdx: 18, ticketIdx: 18, status: QuoteStatus.APPROVED, items: [{ svcIdx: 0, desc: 'Screen Replacement', price: 49 }, { desc: 'iPad Screen', price: 89 }] },
  ]

  const quotes = await Promise.all(
    quotesData.map(async (q) => {
      const subtotal = q.items.reduce((sum, i) => sum + i.price, 0)
      const taxAmount = Math.round(subtotal * 0.08625 * 100) / 100

      return prisma.quote.create({
        data: {
          quoteNumber: q.num,
          customerId: customers[q.customerIdx].id,
          ticketId: tickets[q.ticketIdx].id,
          createdById: users[1].id,
          status: q.status,
          subtotal,
          taxRate: 8.625,
          taxAmount,
          total: subtotal + taxAmount,
          validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          items: {
            create: q.items.map((i) => ({
              itemType: i.svcIdx !== undefined ? 'service' : 'part',
              serviceId: i.svcIdx !== undefined ? services[i.svcIdx].id : null,
              description: i.desc,
              quantity: 1,
              unitPrice: i.price,
              total: i.price,
            })),
          },
        },
      })
    })
  )
  console.log('Quotes created:', quotes.length)

  // Create 25 Sales with historical dates for meaningful reports
  const salesData = [
    { num: 'INV-2024-0001', customerIdx: 3, ticketIdx: 3, method: PaymentMethod.CARD, daysAgo: 28, items: [{ svcIdx: 8, desc: 'Sole Replacement', price: 35 }, { partIdx: 26, desc: 'Sole', price: 25 }] },
    { num: 'INV-2024-0002', customerIdx: 8, ticketIdx: 8, method: PaymentMethod.CASH, daysAgo: 26, items: [{ svcIdx: 9, desc: 'Heel Repair', price: 20 }, { partIdx: 28, desc: 'Heel', price: 15 }] },
    { num: 'INV-2024-0003', customerIdx: 0, ticketIdx: 0, method: PaymentMethod.CARD, daysAgo: 25, items: [{ svcIdx: 0, desc: 'Screen Replacement', price: 49 }, { partIdx: 0, desc: 'iPhone 15 Pro Max Screen', price: 199 }] },
    { num: 'INV-2024-0004', customerIdx: 1, ticketIdx: 1, method: PaymentMethod.CARD, daysAgo: 23, items: [{ svcIdx: 1, desc: 'Battery Replacement', price: 29 }, { partIdx: 10, desc: 'Samsung S24 Battery', price: 55 }] },
    { num: 'INV-2024-0005', customerIdx: 2, ticketIdx: 2, method: PaymentMethod.CASH, daysAgo: 20, items: [{ svcIdx: 3, desc: 'Water Damage Repair', price: 79 }] },
    { num: 'INV-2024-0006', customerIdx: 0, method: PaymentMethod.CARD, daysAgo: 18, items: [{ partIdx: 22, desc: 'Screen Protector', price: 15 }, { partIdx: 23, desc: 'Phone Case', price: 25 }] },
    { num: 'INV-2024-0007', customerIdx: 4, ticketIdx: 4, method: PaymentMethod.CARD, daysAgo: 16, items: [{ svcIdx: 0, desc: 'Screen Replacement', price: 49 }, { partIdx: 2, desc: 'iPhone 13 Screen', price: 149 }] },
    { num: 'INV-2024-0008', customerIdx: 5, ticketIdx: 5, method: PaymentMethod.CARD, daysAgo: 14, items: [{ svcIdx: 13, desc: 'Camera Repair', price: 55 }, { partIdx: 20, desc: 'Camera Module', price: 149 }] },
    { num: 'INV-2024-0009', customerIdx: 1, method: PaymentMethod.CASH, daysAgo: 13, items: [{ partIdx: 24, desc: 'Lightning Cable', price: 19 }] },
    { num: 'INV-2024-0010', customerIdx: 6, ticketIdx: 6, method: PaymentMethod.CARD, daysAgo: 12, items: [{ svcIdx: 6, desc: 'Keyboard Replacement', price: 59 }, { partIdx: 12, desc: 'MacBook Pro Keyboard', price: 249 }] },
    { num: 'INV-2024-0011', customerIdx: 7, ticketIdx: 7, method: PaymentMethod.CARD, daysAgo: 10, items: [{ svcIdx: 11, desc: 'Charging Port Repair', price: 39 }, { partIdx: 16, desc: 'Charging Port', price: 29 }] },
    { num: 'INV-2024-0012', customerIdx: 2, method: PaymentMethod.CARD, daysAgo: 9, items: [{ partIdx: 22, desc: 'Screen Protector', price: 15 }, { partIdx: 25, desc: 'USB-C Cable', price: 15 }] },
    { num: 'INV-2024-0013', customerIdx: 9, ticketIdx: 9, method: PaymentMethod.CARD, daysAgo: 8, items: [{ svcIdx: 0, desc: 'Screen Replacement', price: 49 }, { partIdx: 5, desc: 'Samsung S23 Screen', price: 179 }] },
    { num: 'INV-2024-0014', customerIdx: 10, ticketIdx: 10, method: PaymentMethod.CARD, daysAgo: 7, items: [{ svcIdx: 1, desc: 'Battery Replacement', price: 29 }, { partIdx: 8, desc: 'iPhone 14 Battery', price: 45 }] },
    { num: 'INV-2024-0015', customerIdx: 4, method: PaymentMethod.CHECK, daysAgo: 6, items: [{ svcIdx: 2, desc: 'Diagnostic', price: 25 }] },
    { num: 'INV-2024-0016', customerIdx: 11, ticketIdx: 11, method: PaymentMethod.CARD, daysAgo: 5, items: [{ svcIdx: 5, desc: 'Laptop Repair', price: 75 }] },
    { num: 'INV-2024-0017', customerIdx: 12, ticketIdx: 12, method: PaymentMethod.CARD, daysAgo: 4, items: [{ svcIdx: 12, desc: 'Speaker Replacement', price: 35 }, { partIdx: 18, desc: 'Speaker', price: 39 }] },
    { num: 'INV-2024-0018', customerIdx: 9, method: PaymentMethod.CASH, daysAgo: 4, items: [{ partIdx: 23, desc: 'Phone Case', price: 25 }] },
    { num: 'INV-2024-0019', customerIdx: 13, ticketIdx: 13, method: PaymentMethod.CARD, daysAgo: 3, items: [{ svcIdx: 10, desc: 'Shoe Cleaning', price: 25 }] },
    { num: 'INV-2024-0020', customerIdx: 14, ticketIdx: 14, method: PaymentMethod.CARD, daysAgo: 3, items: [{ svcIdx: 2, desc: 'Diagnostic', price: 25 }] },
    { num: 'INV-2024-0021', customerIdx: 14, method: PaymentMethod.CASH, daysAgo: 2, items: [{ partIdx: 29, desc: 'Shoe Laces', price: 8 }] },
    { num: 'INV-2024-0022', customerIdx: 16, method: PaymentMethod.CARD, daysAgo: 2, items: [{ svcIdx: 7, desc: 'SSD Upgrade', price: 45 }, { partIdx: 14, desc: '512GB SSD', price: 89 }] },
    { num: 'INV-2024-0023', customerIdx: 15, ticketIdx: 15, method: PaymentMethod.CARD, daysAgo: 1, items: [{ svcIdx: 2, desc: 'Diagnostic', price: 25 }, { svcIdx: 13, desc: 'Camera Repair', price: 55 }] },
    { num: 'INV-2024-0024', customerIdx: 18, method: PaymentMethod.BANK_TRANSFER, daysAgo: 1, items: [{ svcIdx: 15, desc: 'Tablet Screen Repair', price: 89 }] },
    { num: 'INV-2024-0025', customerIdx: 19, method: PaymentMethod.CARD, daysAgo: 0, items: [{ partIdx: 22, desc: 'Screen Protector', price: 15 }, { partIdx: 24, desc: 'Lightning Cable', price: 19 }] },
  ]

  await Promise.all(
    salesData.map(async (s) => {
      const items = s.items.map((i: { svcIdx?: number; partIdx?: number; desc: string; price: number }) => ({
        itemType: i.svcIdx !== undefined ? 'service' : (i.partIdx !== undefined ? 'part' : 'accessory'),
        serviceId: i.svcIdx !== undefined ? services[i.svcIdx].id : null,
        partId: i.partIdx !== undefined ? parts[i.partIdx].id : null,
        description: i.desc,
        quantity: 1,
        unitPrice: i.price,
        total: i.price,
      }))
      const subtotal = items.reduce((sum, i) => sum + i.total, 0)
      const taxAmount = Math.round(subtotal * 0.08625 * 100) / 100
      const saleDate = daysAgo(s.daysAgo)

      return prisma.sale.create({
        data: {
          saleNumber: s.num,
          customerId: customers[s.customerIdx].id,
          ticketId: s.ticketIdx !== undefined ? tickets[s.ticketIdx].id : null,
          userId: users[5].id,
          subtotal,
          taxRate: 8.625,
          taxAmount,
          total: subtotal + taxAmount,
          paymentMethod: s.method,
          paymentStatus: PaymentStatus.COMPLETED,
          createdAt: saleDate,
          items: { create: items },
        },
      })
    })
  )
  console.log('Sales created:', salesData.length)

  // Create 15 Auto Order Rules
  const autoOrderRulesData = [
    { partIdx: 0, reorderPoint: 8, reorderQuantity: 15, maxAutoOrderQty: 30 },
    { partIdx: 1, reorderPoint: 10, reorderQuantity: 15, maxAutoOrderQty: 30 },
    { partIdx: 2, reorderPoint: 12, reorderQuantity: 20, maxAutoOrderQty: 40 },
    { partIdx: 4, reorderPoint: 5, reorderQuantity: 10, maxAutoOrderQty: 20 },
    { partIdx: 7, reorderPoint: 15, reorderQuantity: 30, maxAutoOrderQty: 60 },
    { partIdx: 8, reorderPoint: 18, reorderQuantity: 30, maxAutoOrderQty: 60 },
    { partIdx: 9, reorderPoint: 20, reorderQuantity: 40, maxAutoOrderQty: 80 },
    { partIdx: 12, reorderPoint: 3, reorderQuantity: 5, maxAutoOrderQty: 10 },
    { partIdx: 14, reorderPoint: 10, reorderQuantity: 20, maxAutoOrderQty: 40 },
    { partIdx: 16, reorderPoint: 20, reorderQuantity: 40, maxAutoOrderQty: 80 },
    { partIdx: 18, reorderPoint: 15, reorderQuantity: 25, maxAutoOrderQty: 50 },
    { partIdx: 22, reorderPoint: 30, reorderQuantity: 50, maxAutoOrderQty: 100 },
    { partIdx: 24, reorderPoint: 25, reorderQuantity: 40, maxAutoOrderQty: 80 },
    { partIdx: 26, reorderPoint: 15, reorderQuantity: 30, maxAutoOrderQty: 60 },
    { partIdx: 28, reorderPoint: 20, reorderQuantity: 35, maxAutoOrderQty: 70 },
  ]

  const autoOrderRules = await Promise.all(
    autoOrderRulesData.map((r) =>
      prisma.autoOrderRule.create({
        data: {
          partId: parts[r.partIdx].id,
          isEnabled: true,
          reorderPoint: r.reorderPoint,
          reorderQuantity: r.reorderQuantity,
          maxAutoOrderQty: r.maxAutoOrderQty,
          preferredVendorId: parts[r.partIdx].vendorId,
        },
      })
    )
  )
  console.log('Auto Order Rules created:', autoOrderRules.length)

  // Create 15 Auto Order Logs (mix of statuses)
  const autoOrderLogsData = [
    { partIdx: 0, triggeredQty: 5, orderQty: 15, status: AutoOrderStatus.ORDER_CREATED, approved: true },
    { partIdx: 1, triggeredQty: 7, orderQty: 15, status: AutoOrderStatus.ORDER_CREATED, approved: true },
    { partIdx: 2, triggeredQty: 10, orderQty: 20, status: AutoOrderStatus.APPROVED, approved: true },
    { partIdx: 4, triggeredQty: 3, orderQty: 10, status: AutoOrderStatus.REJECTED, approved: false, reason: 'Budget constraints this month' },
    { partIdx: 7, triggeredQty: 12, orderQty: 30, status: AutoOrderStatus.PENDING_APPROVAL, approved: false },
    { partIdx: 8, triggeredQty: 14, orderQty: 30, status: AutoOrderStatus.PENDING_APPROVAL, approved: false },
    { partIdx: 9, triggeredQty: 18, orderQty: 40, status: AutoOrderStatus.PENDING_APPROVAL, approved: false },
    { partIdx: 12, triggeredQty: 2, orderQty: 5, status: AutoOrderStatus.ORDER_CREATED, approved: true },
    { partIdx: 14, triggeredQty: 8, orderQty: 20, status: AutoOrderStatus.APPROVED, approved: true },
    { partIdx: 16, triggeredQty: 15, orderQty: 40, status: AutoOrderStatus.PENDING_APPROVAL, approved: false },
    { partIdx: 18, triggeredQty: 12, orderQty: 25, status: AutoOrderStatus.REJECTED, approved: false, reason: 'Using alternate supplier' },
    { partIdx: 22, triggeredQty: 25, orderQty: 50, status: AutoOrderStatus.ORDER_CREATED, approved: true },
    { partIdx: 24, triggeredQty: 20, orderQty: 40, status: AutoOrderStatus.APPROVED, approved: true },
    { partIdx: 26, triggeredQty: 10, orderQty: 30, status: AutoOrderStatus.PENDING_APPROVAL, approved: false },
    { partIdx: 28, triggeredQty: 15, orderQty: 35, status: AutoOrderStatus.CANCELLED, approved: false, reason: 'Duplicate request' },
  ]

  await Promise.all(
    autoOrderLogsData.map((l) =>
      prisma.autoOrderLog.create({
        data: {
          partId: parts[l.partIdx].id,
          triggeredQuantity: l.triggeredQty,
          orderQuantity: l.orderQty,
          status: l.status,
          approvedById: l.approved ? users[1].id : null,
          approvedAt: l.approved ? new Date() : null,
          rejectionReason: l.reason || null,
        },
      })
    )
  )
  console.log('Auto Order Logs created:', autoOrderLogsData.length)

  // Create 15 Quote Approvals
  const approvalQuotes = quotes.slice(0, 12)
  await Promise.all(
    approvalQuotes.map((q, idx) => {
      let status: ApprovalStatus
      let sentAt: Date | null = daysAgo(7 - idx)
      let viewedAt: Date | null = null
      let respondedAt: Date | null = null

      if (idx < 3) {
        status = ApprovalStatus.APPROVED
        viewedAt = daysAgo(6 - idx)
        respondedAt = daysAgo(5 - idx)
      } else if (idx < 5) {
        status = ApprovalStatus.REJECTED
        viewedAt = daysAgo(6 - idx)
        respondedAt = daysAgo(5 - idx)
      } else if (idx < 8) {
        status = ApprovalStatus.VIEWED
        viewedAt = daysAgo(1)
      } else if (idx < 10) {
        status = ApprovalStatus.PENDING
      } else {
        status = ApprovalStatus.EXPIRED
      }

      return prisma.quoteApproval.create({
        data: {
          quoteId: q.id,
          status,
          sentAt,
          sentToEmail: customers[idx % customers.length].email,
          viewedAt,
          respondedAt,
          customerNotes: status === ApprovalStatus.APPROVED ? 'Looks good, please proceed!' : (status === ApprovalStatus.REJECTED ? 'Price too high, please revise.' : null),
          expiresAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        },
      })
    })
  )
  console.log('Quote Approvals created:', approvalQuotes.length)

  // Helper function to generate claim number
  const generateClaimNum = (idx: number) => `WC-2024-${String(idx + 1).padStart(4, '0')}`

  // Create 18 Warranty Claims
  const warrantyClaimsData = [
    { customerIdx: 0, ticketIdx: 0, product: 'iPhone 15 Pro Max Screen', status: WarrantyClaimStatus.COMPLETED, amount: 199, approved: 149, daysAgo: 25 },
    { customerIdx: 1, ticketIdx: 1, product: 'Samsung S24 Battery', status: WarrantyClaimStatus.COMPLETED, amount: 55, approved: 55, daysAgo: 22 },
    { customerIdx: 2, ticketIdx: 2, product: 'iPhone 14 Pro Water Damage Repair', status: WarrantyClaimStatus.REJECTED, amount: 150, daysAgo: 20 },
    { customerIdx: 4, ticketIdx: 4, product: 'iPad Screen Replacement', status: WarrantyClaimStatus.APPROVED, amount: 178, approved: 150, daysAgo: 18 },
    { customerIdx: 5, ticketIdx: 5, product: 'Pixel 8 Camera Module', status: WarrantyClaimStatus.COMPLETED, amount: 149, approved: 149, daysAgo: 15 },
    { customerIdx: 6, ticketIdx: 6, product: 'MacBook Keyboard Replacement', status: WarrantyClaimStatus.UNDER_REVIEW, amount: 328, daysAgo: 12 },
    { customerIdx: 7, ticketIdx: 7, product: 'iPhone Charging Port', status: WarrantyClaimStatus.APPROVED, amount: 68, approved: 68, daysAgo: 10 },
    { customerIdx: 9, ticketIdx: 9, product: 'Samsung Tab S9 Screen', status: WarrantyClaimStatus.SUBMITTED, amount: 228, daysAgo: 8 },
    { customerIdx: 10, ticketIdx: 10, product: 'iPhone 12 Battery', status: WarrantyClaimStatus.COMPLETED, amount: 74, approved: 74, daysAgo: 7 },
    { customerIdx: 11, ticketIdx: 11, product: 'MacBook Air Trackpad', status: WarrantyClaimStatus.UNDER_REVIEW, amount: 120, daysAgo: 6 },
    { customerIdx: 12, ticketIdx: 12, product: 'Samsung S23 Speaker', status: WarrantyClaimStatus.SUBMITTED, amount: 74, daysAgo: 5 },
    { customerIdx: 14, ticketIdx: 14, product: 'Apple Watch Battery', status: WarrantyClaimStatus.APPROVED, amount: 89, approved: 89, daysAgo: 4 },
    { customerIdx: 15, ticketIdx: 15, product: 'iPhone 15 Face ID Sensor', status: WarrantyClaimStatus.SUBMITTED, amount: 195, daysAgo: 3 },
    { customerIdx: 16, ticketIdx: 16, product: 'HP Spectre Fan Assembly', status: WarrantyClaimStatus.UNDER_REVIEW, amount: 95, daysAgo: 2 },
    { customerIdx: 17, ticketIdx: 17, product: 'Pixel 7 Fingerprint Sensor', status: WarrantyClaimStatus.SUBMITTED, amount: 85, daysAgo: 1 },
    { customerIdx: 18, ticketIdx: 18, product: 'iPad Air Screen', status: WarrantyClaimStatus.SUBMITTED, amount: 138, daysAgo: 0 },
    { customerIdx: 3, product: 'Allen Edmonds Sole Replacement', status: WarrantyClaimStatus.REJECTED, amount: 60, daysAgo: 15, issue: 'Wear and tear not covered under warranty' },
    { customerIdx: 8, product: 'Nike Air Max Sole', status: WarrantyClaimStatus.CANCELLED, amount: 40, daysAgo: 10, issue: 'Customer withdrew claim' },
  ]

  const warrantyClaims = await Promise.all(
    warrantyClaimsData.map((w, idx) =>
      prisma.warrantyClaim.create({
        data: {
          claimNumber: generateClaimNum(idx),
          customerId: customers[w.customerIdx].id,
          ticketId: w.ticketIdx !== undefined ? tickets[w.ticketIdx].id : null,
          status: w.status,
          productDescription: w.product,
          purchaseDate: daysAgo(90 + idx * 5),
          warrantyEndDate: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000),
          issueDescription: w.issue || `Defect discovered after ${Math.floor(Math.random() * 30) + 10} days of use. Requesting warranty coverage for repair/replacement.`,
          resolution: w.status === WarrantyClaimStatus.COMPLETED ? 'Claim processed and reimbursement issued.' : (w.status === WarrantyClaimStatus.REJECTED ? 'Claim denied: ' + (w.issue || 'Damage not covered under warranty terms.') : null),
          claimAmount: w.amount,
          approvedAmount: w.approved || null,
          submittedAt: daysAgo(w.daysAgo),
          reviewedAt: ([WarrantyClaimStatus.UNDER_REVIEW, WarrantyClaimStatus.APPROVED, WarrantyClaimStatus.REJECTED, WarrantyClaimStatus.COMPLETED] as string[]).includes(w.status) ? daysAgo(Math.max(0, w.daysAgo - 2)) : null,
          resolvedAt: ([WarrantyClaimStatus.APPROVED, WarrantyClaimStatus.REJECTED, WarrantyClaimStatus.COMPLETED] as string[]).includes(w.status) ? daysAgo(Math.max(0, w.daysAgo - 3)) : null,
          statusHistory: {
            create: [
              { toStatus: WarrantyClaimStatus.SUBMITTED, notes: 'Claim submitted', changedBy: 'System' },
              ...(w.status !== WarrantyClaimStatus.SUBMITTED ? [{ fromStatus: WarrantyClaimStatus.SUBMITTED, toStatus: WarrantyClaimStatus.UNDER_REVIEW, notes: 'Claim under review', changedBy: `${users[1].firstName} ${users[1].lastName}` }] : []),
              ...(w.status === WarrantyClaimStatus.APPROVED || w.status === WarrantyClaimStatus.COMPLETED ? [{ fromStatus: WarrantyClaimStatus.UNDER_REVIEW, toStatus: WarrantyClaimStatus.APPROVED, notes: 'Claim approved', changedBy: `${users[0].firstName} ${users[0].lastName}` }] : []),
              ...(w.status === WarrantyClaimStatus.REJECTED ? [{ fromStatus: WarrantyClaimStatus.UNDER_REVIEW, toStatus: WarrantyClaimStatus.REJECTED, notes: 'Claim rejected', changedBy: `${users[0].firstName} ${users[0].lastName}` }] : []),
              ...(w.status === WarrantyClaimStatus.COMPLETED ? [{ fromStatus: WarrantyClaimStatus.APPROVED, toStatus: WarrantyClaimStatus.COMPLETED, notes: 'Reimbursement processed', changedBy: `${users[1].firstName} ${users[1].lastName}` }] : []),
            ]
          }
        },
      })
    )
  )
  console.log('Warranty Claims created:', warrantyClaims.length)

  // Create a few AI Diagnostic Sessions for demo
  const aiSessionsData = [
    { ticketIdx: 16, messages: [
      { role: 'user', content: 'The laptop fan is making a grinding noise' },
      { role: 'assistant', content: 'A grinding noise from the fan typically indicates bearing failure or debris accumulation. Let me ask a few questions to narrow this down. When did you first notice this noise? Does it happen constantly or only during heavy use?' },
      { role: 'user', content: 'It started about a week ago and happens more when I run heavy programs' },
      { role: 'assistant', content: 'That timing and behavior pattern suggests the fan bearings are wearing out. Under heavy load, the fan spins faster which exacerbates the bearing issue. I recommend replacing the fan assembly. In the meantime, you can try cleaning the vents with compressed air, but this is likely a hardware issue that needs physical repair.' }
    ]},
    { ticketIdx: 22, messages: [
      { role: 'user', content: 'Touch screen corners not responding' },
      { role: 'assistant', content: 'Touch screen issues in specific areas usually indicate either a digitizer problem or a connection issue. Does the problem affect just one corner or multiple corners? Also, has the device been dropped recently?' },
      { role: 'user', content: 'Only the top right corner, and no it hasnt been dropped' },
      { role: 'assistant', content: 'Since its isolated to one corner without physical damage, this is likely a digitizer calibration issue or partial digitizer failure. We should try a soft reset first. If that doesnt work, the digitizer may need recalibration or replacement. The good news is this type of repair is usually straightforward.' }
    ]},
  ]

  for (const sess of aiSessionsData) {
    const session = await prisma.aiDiagnosticSession.create({
      data: {
        ticketId: tickets[sess.ticketIdx].id,
        confidence: 0.75,
        suggestedIssues: JSON.stringify(['Hardware component failure', 'Connection issue']),
        suggestedTests: JSON.stringify(['Component inspection', 'Diagnostic software check']),
      }
    })
    for (const msg of sess.messages) {
      await prisma.aiDiagnosticMessage.create({
        data: {
          sessionId: session.id,
          role: msg.role,
          content: msg.content,
        }
      })
    }
  }
  console.log('AI Diagnostic Sessions created:', aiSessionsData.length)

  console.log('Seed completed successfully!')
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })
