import type { BdLocationDatabase } from '../types';

/**
 * Verified Bangladesh Administrative Hierarchy (Parent-Child ID linked).
 * Supports all 8 Divisions and representative real Districts, Upazilas, Unions, and Villages,
 * plus Central Admin dynamic additions and Manual Entry fallback for any unlisted rural/urban area.
 */
export const INITIAL_BD_LOCATIONS: BdLocationDatabase = {
  divisions: [
    { id: 'div-dhk', parentId: null, nameBn: 'ঢাকা', nameEn: 'Dhaka', isActive: true },
    { id: 'div-ctg', parentId: null, nameBn: 'চট্টগ্রাম', nameEn: 'Chattogram', isActive: true },
    { id: 'div-raj', parentId: null, nameBn: 'রাজশাহী', nameEn: 'Rajshahi', isActive: true },
    { id: 'div-khl', parentId: null, nameBn: 'খুলনা', nameEn: 'Khulna', isActive: true },
    { id: 'div-bar', parentId: null, nameBn: 'বরিশাল', nameEn: 'Barishal', isActive: true },
    { id: 'div-syl', parentId: null, nameBn: 'সিলেট', nameEn: 'Sylhet', isActive: true },
    { id: 'div-rng', parentId: null, nameBn: 'রংপুর', nameEn: 'Rangpur', isActive: true },
    { id: 'div-mym', parentId: null, nameBn: 'ময়মনসিংহ', nameEn: 'Mymensingh', isActive: true },
  ],
  districts: [
    // Dhaka Division
    { id: 'dist-dhk', parentId: 'div-dhk', nameBn: 'ঢাকা', nameEn: 'Dhaka', isActive: true },
    { id: 'dist-gaz', parentId: 'div-dhk', nameBn: 'গাজীপুর', nameEn: 'Gazipur', isActive: true },
    { id: 'dist-nar', parentId: 'div-dhk', nameBn: 'নারায়ণগঞ্জ', nameEn: 'Narayanganj', isActive: true },
    { id: 'dist-tan', parentId: 'div-dhk', nameBn: 'টাঙ্গাইল', nameEn: 'Tangail', isActive: true },
    { id: 'dist-far', parentId: 'div-dhk', nameBn: 'ফরিদপুর', nameEn: 'Faridpur', isActive: true },
    // Chattogram Division
    { id: 'dist-ctg', parentId: 'div-ctg', nameBn: 'চট্টগ্রাম', nameEn: 'Chattogram', isActive: true },
    { id: 'dist-cum', parentId: 'div-ctg', nameBn: 'কুমিল্লা', nameEn: 'Cumilla', isActive: true },
    { id: 'dist-cox', parentId: 'div-ctg', nameBn: 'কক্সবাজার', nameEn: "Cox's Bazar", isActive: true },
    { id: 'dist-noa', parentId: 'div-ctg', nameBn: 'নোয়াখালী', nameEn: 'Noakhali', isActive: true },
    // Rajshahi Division
    { id: 'dist-raj', parentId: 'div-raj', nameBn: 'রাজশাহী', nameEn: 'Rajshahi', isActive: true },
    { id: 'dist-bog', parentId: 'div-raj', nameBn: 'বগুড়া', nameEn: 'Bogura', isActive: true },
    { id: 'dist-pab', parentId: 'div-raj', nameBn: 'পাবনা', nameEn: 'Pabna', isActive: true },
    // Khulna Division
    { id: 'dist-khl', parentId: 'div-khl', nameBn: 'খুলনা', nameEn: 'Khulna', isActive: true },
    { id: 'dist-jes', parentId: 'div-khl', nameBn: 'যশোর', nameEn: 'Jashore', isActive: true },
    // Barishal Division
    { id: 'dist-bar', parentId: 'div-bar', nameBn: 'বরিশাল', nameEn: 'Barishal', isActive: true },
    { id: 'dist-bho', parentId: 'div-bar', nameBn: 'ভোলা', nameEn: 'Bhola', isActive: true },
    // Sylhet Division
    { id: 'dist-syl', parentId: 'div-syl', nameBn: 'সিলেট', nameEn: 'Sylhet', isActive: true },
    { id: 'dist-mou', parentId: 'div-syl', nameBn: 'মৌলভীবাজার', nameEn: 'Moulvibazar', isActive: true },
    // Rangpur Division
    { id: 'dist-rng', parentId: 'div-rng', nameBn: 'রংপুর', nameEn: 'Rangpur', isActive: true },
    { id: 'dist-din', parentId: 'div-rng', nameBn: 'দিনাজপুর', nameEn: 'Dinajpur', isActive: true },
    // Mymensingh Division
    { id: 'dist-mym', parentId: 'div-mym', nameBn: 'ময়মনসিংহ', nameEn: 'Mymensingh', isActive: true },
    { id: 'dist-jam', parentId: 'div-mym', nameBn: 'জামালপুর', nameEn: 'Jamalpur', isActive: true },
  ],
  upazilas: [
    // Dhaka
    { id: 'upz-mirpur', parentId: 'dist-dhk', nameBn: 'মিরপুর', nameEn: 'Mirpur', isActive: true },
    { id: 'upz-savar', parentId: 'dist-dhk', nameBn: 'সাভার', nameEn: 'Savar', isActive: true },
    { id: 'upz-dhamrai', parentId: 'dist-dhk', nameBn: 'ধামরাই', nameEn: 'Dhamrai', isActive: true },
    { id: 'upz-dhanmondi', parentId: 'dist-dhk', nameBn: 'ধানমন্ডি', nameEn: 'Dhanmondi', isActive: true },
    // Gazipur
    { id: 'upz-gaz-sadar', parentId: 'dist-gaz', nameBn: 'গাজীপুর সদর', nameEn: 'Gazipur Sadar', isActive: true },
    { id: 'upz-kaliganj', parentId: 'dist-gaz', nameBn: 'কালীগঞ্জ', nameEn: 'Kaliganj', isActive: true },
    // Chattogram
    { id: 'upz-kotwali', parentId: 'dist-ctg', nameBn: 'কোতোয়ালী', nameEn: 'Kotwali', isActive: true },
    { id: 'upz-patiya', parentId: 'dist-ctg', nameBn: 'পটিয়া', nameEn: 'Patiya', isActive: true },
    // Rajshahi
    { id: 'upz-boalia', parentId: 'dist-raj', nameBn: 'বোয়ালিয়া', nameEn: 'Boalia', isActive: true },
    { id: 'upz-paba', parentId: 'dist-raj', nameBn: 'পবা', nameEn: 'Paba', isActive: true },
    // Khulna
    { id: 'upz-sonadanga', parentId: 'dist-khl', nameBn: 'সোনাডাঙ্গা', nameEn: 'Sonadanga', isActive: true },
    // Sylhet
    { id: 'upz-syl-sadar', parentId: 'dist-syl', nameBn: 'সিলেট সদর', nameEn: 'Sylhet Sadar', isActive: true },
    // Barishal
    { id: 'upz-bar-sadar', parentId: 'dist-bar', nameBn: 'বরিশাল সদর', nameEn: 'Barishal Sadar', isActive: true },
    // Rangpur
    { id: 'upz-rng-sadar', parentId: 'dist-rng', nameBn: 'রংপুর সদর', nameEn: 'Rangpur Sadar', isActive: true },
    // Mymensingh
    { id: 'upz-mym-sadar', parentId: 'dist-mym', nameBn: 'ময়মনসিংহ সদর', nameEn: 'Mymensingh Sadar', isActive: true },
  ],
  unions: [
    { id: 'uni-pallabi', parentId: 'upz-mirpur', nameBn: 'পল্লবী / ওয়ার্ড ০২', nameEn: 'Pallabi / Ward 02', isActive: true },
    { id: 'uni-kazipara', parentId: 'upz-mirpur', nameBn: 'কাজীপাড়া / ওয়ার্ড ১৪', nameEn: 'Kazipara / Ward 14', isActive: true },
    { id: 'uni-ashulia', parentId: 'upz-savar', nameBn: 'আশুলিয়া', nameEn: 'Ashulia', isActive: true },
    { id: 'uni-birulia', parentId: 'upz-savar', nameBn: 'বিরুলিয়া', nameEn: 'Birulia', isActive: true },
    { id: 'uni-anderkilla', parentId: 'upz-kotwali', nameBn: 'আন্দরকিল্লা', nameEn: 'Anderkilla', isActive: true },
    { id: 'uni-sabujbagh', parentId: 'upz-boalia', nameBn: 'সবুজবাগ / ওয়ার্ড ১৯', nameEn: 'Sabujbagh / Ward 19', isActive: true },
    { id: 'uni-sonadanga-1', parentId: 'upz-sonadanga', nameBn: 'সোনাডাঙ্গা ওয়ার্ড ১৭', nameEn: 'Sonadanga Ward 17', isActive: true },
    { id: 'uni-khadimnagar', parentId: 'upz-syl-sadar', nameBn: 'খাদিম নগর', nameEn: 'Khadimnagar', isActive: true },
  ],
  villages: [
    { id: 'vil-mirpur10', parentId: 'uni-pallabi', nameBn: 'মিরপুর সেকশন ১০', nameEn: 'Mirpur Section 10', isActive: true },
    { id: 'vil-pallabi-blk-c', parentId: 'uni-pallabi', nameBn: 'পল্লবী ব্লক সি', nameEn: 'Pallabi Block C', isActive: true },
    { id: 'vil-kazipara-e', parentId: 'uni-kazipara', nameBn: 'পূর্ব কাজীপাড়া', nameEn: 'East Kazipara', isActive: true },
    { id: 'vil-jamgora', parentId: 'uni-ashulia', nameBn: 'জামগড়া', nameEn: 'Jamgora', isActive: true },
    { id: 'vil-birulia-bazar', parentId: 'uni-birulia', nameBn: 'বিরুলিয়া বাজার', nameEn: 'Birulia Bazar', isActive: true },
    { id: 'vil-jamalkhan', parentId: 'uni-anderkilla', nameBn: 'জামালখান', nameEn: 'Jamalkhan', isActive: true },
    { id: 'vil-padma-ab', parentId: 'uni-sabujbagh', nameBn: 'পদ্মা আবাসিক এলাকা', nameEn: 'Padma Residential Area', isActive: true },
    { id: 'vil-shib-bari', parentId: 'uni-sonadanga-1', nameBn: 'শিববাড়ী', nameEn: 'Shib Bari', isActive: true },
    { id: 'vil-shahparan', parentId: 'uni-khadimnagar', nameBn: 'শাহপরান গেট', nameEn: 'Shahparan Gate', isActive: true },
  ],
};
