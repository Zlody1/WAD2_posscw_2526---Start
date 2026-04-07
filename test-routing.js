// Quick test to verify routing fix
import { app } from './index.js';

const testRoutes = async () => {
  console.log('Testing routes...');

  // Test home page
  const homeRes = await fetch('http://localhost:3000/');
  console.log('Home page status:', homeRes.status);
  console.log('Home page content-type:', homeRes.headers.get('content-type'));

  // Test courses page
  const coursesRes = await fetch('http://localhost:3000/courses');
  console.log('Courses page status:', coursesRes.status);
  console.log('Courses page content-type:', coursesRes.headers.get('content-type'));

  // Test API courses
  const apiCoursesRes = await fetch('http://localhost:3000/api/courses');
  console.log('API courses status:', apiCoursesRes.status);
  console.log('API courses content-type:', apiCoursesRes.headers.get('content-type'));
};

testRoutes().catch(console.error);