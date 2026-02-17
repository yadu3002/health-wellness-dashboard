# Corporate Health & Wellness Analytics Dashboard

A comprehensive, enterprise-grade health analytics platform designed for corporate wellness programs. This full-stack web application provides real-time health risk assessment, interactive data visualization, and automated report generation for healthcare administrators and HR departments.

## 🎯 Project Overview

This dashboard enables organizations to analyze employee health data, identify risk factors, track wellness trends, and generate professional reports. Built with modern web technologies, it processes large datasets efficiently and provides intuitive visualizations for complex health metrics.

## ✨ Key Features

### 📊 **Interactive Data Visualization**
- **10+ Health Metric Dashboards**: Real-time charts for Diabetes, Hypertension, Cholesterol, Obesity, Fitness, Stress, Medication, Chronic Diseases, Age/Gender distribution, and Overview metrics
- **Interactive Popup Charts**: Clickable charts with detailed breakdowns and drill-down capabilities
- **Multiple Chart Types**: Bar charts, donut charts, grouped bar charts, horizontal bar charts using ApexCharts and Chart.js
- **Dynamic Chart Updates**: Real-time chart regeneration based on filter selections with optimized rendering

### 🔍 **Advanced Filtering & Search System**
- **Multi-Criteria Filtering**: Filter by company, date range (DOS), employee search, and group profile
- **Intelligent Employee Search**: Search across employee ID, name, and phone number with real-time filtering
- **Date Range Selection**: Flexible date picker with month/year selection using Flatpickr
- **Company Dropdown**: Dynamic company list population from dataset
- **Debounced Filter Updates**: Optimized performance with 50ms debounce to prevent excessive re-renders

### 📈 **Health Risk Assessment**
- **Diabetes Risk Classification**: Pre-Diabetes, Diabetes, Normal based on FBS (≥126) and RBS (≥200) thresholds
- **Hypertension Risk Grading**: Pre-HTN, Grade I, Grade II, Grade III based on systolic/diastolic BP thresholds
- **Cholesterol Risk Levels**: Normal, Mild Hyper, Moderate Hyper, Severe Hyper based on clinical thresholds
- **Obesity Risk (BMI)**: Classification using WHO standards (BMI ≥30)
- **Fitness Level Assessment**: Categorized fitness levels based on exercise frequency
- **Stress Level Analysis**: Multi-factor stress scoring system
- **Medication Risk Assessment**: Identifies unmedicated individuals with chronic conditions
- **Chronic Disease Tracking**: Intelligent parsing of medication details with multi-word condition recognition

### 📄 **Professional Report Generation**
- **Word Document Reports**: Automated generation of comprehensive Group Profile reports
- **Dynamic Chart Injection**: Captures popup charts as high-resolution images and injects into Word templates
- **Template-Based System**: Uses Docxtemplater for dynamic content insertion
- **Image Processing**: Custom XML manipulation to replace Word-native charts and images
- **Employee List Tables**: Automatically generated employee lists with health metrics
- **Date Range Reports**: Generate reports for specific time periods with filtered data

### 📤 **Data Export Capabilities**
- **Excel Export**: Export filtered employee lists to Excel format (.xlsx)
- **PDF-Ready HTML**: Print-optimized HTML tables for PDF generation
- **CSV Support**: Data import from Excel/CSV files

### 🎨 **User Interface & Experience**
- **Responsive Design**: Fully responsive layout optimized for desktop, tablet, and mobile devices
- **Modern UI/UX**: Clean, professional interface with gradient backgrounds and smooth animations
- **Loading States**: Visual loading indicators during data processing
- **Empty State Handling**: Graceful handling of empty datasets with informative messages
- **Accessibility**: Font Awesome icons, semantic HTML, and keyboard navigation support

### ⚡ **Performance Optimizations**
- **Efficient DOM Manipulation**: String-based HTML generation instead of individual DOM operations
- **Chart Animation Control**: Disabled animations on data updates for faster rendering
- **Debounced Filtering**: Prevents excessive re-renders during rapid filter changes
- **Optimized Data Processing**: Single-pass data analysis with efficient algorithms
- **Lazy Chart Rendering**: Charts only render when data is available

## 🛠️ Tech Stack

### **Frontend**
| Technology | Version | Purpose |
|------------|---------|---------|
| **HTML5/CSS3** | Latest | Semantic markup, modern CSS features (Flexbox, Grid, CSS Variables) |
| **JavaScript (ES6+)** | ES2020+ | Vanilla JavaScript with async/await, modern patterns |
| **ApexCharts** | Latest | Advanced interactive charting library |
| **Chart.js** | Latest | Additional charting capabilities with plugin support |
| **Flatpickr** | Latest | Modern date picker with range selection |
| **Font Awesome** | 6.5.2 | Icon library for UI elements |
| **Tailwind CSS** | Latest | Utility-first CSS framework (selective use) |

### **Backend**
| Technology | Version | Purpose |
|------------|---------|---------|
| **Node.js** | 18+ | Server-side JavaScript runtime |
| **Express.js** | 5.2.1 | Web application framework, RESTful API |
| **CORS** | 2.8.5 | Cross-origin resource sharing middleware |

### **Data Processing & Document Generation**
| Technology | Version | Purpose |
|------------|---------|---------|
| **XLSX.js** | 0.18.5 | Excel file parsing and generation |
| **Docxtemplater** | 3.67.6 | Word document template processing with dynamic content |
| **Pizzip** | 3.2.0 | ZIP file manipulation for Word document structure |
| **Adm-Zip** | 0.5.16 | Additional ZIP file handling utilities |
| **XML2JS** | 0.6.2 | XML parsing for Word document manipulation |

### **DevOps & Deployment**
| Technology | Purpose |
|------------|---------|
| **Docker** | Containerization for consistent deployment |
| **Docker Compose** | Multi-container orchestration and one-command deployment |

## 🏗️ Architecture

### **System Architecture Overview**

The application follows a **client-server architecture** with a stateless backend API and a rich client-side frontend. The architecture is designed for scalability and maintainability.

```
┌─────────────────────────────────────────────────────────────┐
│                        Client Layer                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ Admin Page   │  │ Corporate   │  │ Landing Page │      │
│  │ (Dashboard)  │  │ Dashboard   │  │ (Upload)    │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│         │                 │                 │                │
│         └─────────────────┼─────────────────┘                │
│                           │                                   │
│                  ┌────────▼────────┐                         │
│                  │  Client Logic    │                         │
│                  │  - Data Filtering│                         │
│                  │  - Chart Render  │                         │
│                  │  - UI Management │                         │
│                  └────────┬─────────┘                         │
└───────────────────────────┼───────────────────────────────────┘
                             │ HTTP/REST
┌───────────────────────────▼───────────────────────────────────┐
│                      Server Layer (Express.js)                │
│  ┌────────────────────────────────────────────────────────┐  │
│  │              Static File Serving                       │  │
│  │  - HTML, CSS, JavaScript files                         │  │
│  │  - Client-side assets                                 │  │
│  └────────────────────────────────────────────────────────┘  │
│  ┌────────────────────────────────────────────────────────┐  │
│  │              API Endpoints                             │  │
│  │  GET  /get-my-data          → Returns cached Excel data│  │
│  │  POST /generate-report      → Generates Word document  │  │
│  └────────────────────────────────────────────────────────┘  │
│  ┌────────────────────────────────────────────────────────┐  │
│  │         Data Processing Layer                          │  │
│  │  - Excel parsing (XLSX.js)                            │  │
│  │  - Health metrics calculation                         │  │
│  │  - Data filtering and transformation                  │  │
│  └────────────────────────────────────────────────────────┘  │
│  ┌────────────────────────────────────────────────────────┐  │
│  │      Document Generation Layer                        │  │
│  │  - Word template processing (Docxtemplater)            │  │
│  │  - Image injection (Custom XML manipulation)         │  │
│  │  - Chart image capture and embedding                 │  │
│  └────────────────────────────────────────────────────────┘  │
└───────────────────────────────────────────────────────────────┘
                             │
┌───────────────────────────▼───────────────────────────────────┐
│                    Data Storage Layer                          │
│  ┌──────────────────┐  ┌──────────────────┐                  │
│  │ Excel Files      │  │ Word Templates   │                  │
│  │ (./data/)        │  │ (./data/)        │                  │
│  └──────────────────┘  └──────────────────┘                  │
└───────────────────────────────────────────────────────────────┘
```

### **Backend Flow**

#### **1. Server Initialization**
```
Server Start
    ↓
Load Excel Data (./data/Dashboard Data.xlsx)
    ↓
Parse with XLSX.js → Convert to JSON array
    ↓
Cache in Memory (cachedData)
    ↓
Start Express Server (Port 3000)
    ↓
Configure Middleware:
    - Static file serving
    - CORS enabled
    - JSON body parser (50MB limit)
    - URL-encoded parser (50MB limit)
```

#### **2. Data Retrieval Flow (GET /get-my-data)**
```
Client Request
    ↓
Express Route Handler
    ↓
Return Cached Data (JSON)
    ↓
Client Receives Data
    ↓
Frontend Processing:
    - Column mapping (findCol)
    - Health metric calculations
    - Chart generation
    - UI updates
```

#### **3. Report Generation Flow (POST /generate-report)**
```
Client Initiates Report Generation
    ↓
Capture Chart Images (Base64 PNGs)
    ↓
Prepare Report Data:
    - Text data (employee lists, metrics)
    - Chart images (_chartImages object)
    ↓
POST /generate-report
    ↓
Server Processing:
    ├─ Separate chart images from text data
    ├─ Convert base64 → Buffer objects
    ├─ Load Word template (./data/Group Profile CorporateHRA Scan.docx)
    └─ Validate template structure
    ↓
Phase 1: Text Replacement
    ├─ Initialize Docxtemplater
    ├─ Render template with text data
    └─ Generate intermediate Word document
    ↓
Phase 2: Image Injection
    ├─ Parse Word document as ZIP archive
    ├─ Locate images by alt-text matching
    ├─ Replace media files in word/media/
    ├─ Update XML relationships
    └─ Handle Word-native charts → Picture conversion
    ↓
Generate Final Word Document
    ↓
Send Response (application/vnd.openxmlformats-officedocument.wordprocessingml.document)
    ↓
Client Downloads .docx File
```

#### **4. Image Injection Process (Custom Implementation)**
```
For each chart image:
    ↓
Parse Word document XML:
    - word/document.xml
    - word/header*.xml
    - word/footer*.xml
    ↓
Find matching elements:
    - Search for <w:drawing> with matching descr attribute
    ↓
Handle two cases:
    ├─ Case A: Word-native charts
    │   └─ Replace <a:graphic> with picture-based graphic
    └─ Case B: Regular pictures
        └─ Update r:embed relationship Target
    ↓
Update ZIP archive:
    - Add new PNG to word/media/
    - Update word/_rels/*.rels files
    - Modify XML content
    ↓
Generate final Word document buffer
```

### **Frontend Flow**

#### **1. Data Loading & Initialization**
```
Page Load
    ↓
Fetch /get-my-data
    ↓
Parse Response → Array[Array]
    ↓
Extract Header Row → Normalize column names
    ↓
Initialize Filters:
    - Company dropdown population
    - Date picker initialization
    - Search input setup
    ↓
Calculate Initial Metrics:
    - Overview (companies, employees)
    - Health risk calculations
    - Demographic distributions
    ↓
Render Charts (ApexCharts/Chart.js)
    ↓
Populate Data Table
```

#### **2. Filtering & Chart Updates**
```
User Interaction (Filter Change)
    ↓
Debounce (50ms delay)
    ↓
Apply Filters:
    - Company filter
    - Date range filter
    - Employee search
    - Group profile filter
    ↓
Filter Data Array:
    - Iterate through rows
    - Apply filter conditions
    - Return filtered subset
    ↓
Recalculate Metrics:
    - Health risk counts
    - Demographic distributions
    - Overview statistics
    ↓
Update Charts:
    - Destroy existing chart instances
    - Create new charts with filtered data
    - Disable animations for performance
    ↓
Update Data Table:
    - Rebuild table HTML
    - Apply string-based rendering
```

#### **3. Report Generation (Client-Side)**
```
User Clicks "Print Report"
    ↓
Validate Company Selection
    ↓
Capture Chart Images:
    - Create hidden div elements
    - Render ApexCharts off-screen
    - Capture as base64 PNG (dataURI)
    - Destroy temporary charts
    ↓
Prepare Report Payload:
    - Filter data by date range
    - Calculate metrics
    - Build employee list
    - Attach chart images
    ↓
POST /generate-report
    ↓
Receive Word Document Blob
    ↓
Trigger Download
```

## 🚀 Getting Started

### **Prerequisites**
- Docker and Docker Compose installed
- Modern web browser (Chrome, Firefox, Edge, Safari)
- Excel/CSV data files with health metrics (optional - sample data included)

### **Quick Start with Docker (Recommended)**

The easiest way to run the application is using Docker Compose:

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd Health-Dashboard
   ```

2. **Start the application**
   ```bash
   docker-compose up -d
   ```
   This command will:
   - Build the Docker image
   - Start the container
   - Make the application available at `http://localhost:3000`

3. **Access the application**
   - Open your browser and navigate to `http://localhost:3000`
   - The application will load with sample data from `./data/Dashboard Data.xlsx`

4. **View logs** (optional)
   ```bash
   docker-compose logs -f
   ```

5. **Stop the application**
   ```bash
   docker-compose down
   ```

### **Manual Installation (Without Docker)**

If you prefer to run without Docker:

1. **Install Node.js** (v18 or higher)
   - Download from [nodejs.org](https://nodejs.org/)

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start the server**
   ```bash
   npm start
   ```
   Server runs on `http://localhost:3000`

4. **Open the application**
   - Navigate to `http://localhost:3000` in your browser
   - Upload an Excel/CSV file with health data
   - Use the admin dashboard to view analytics

### **Data Format Requirements**

The application expects Excel/CSV files with the following columns (case-insensitive):
- **Employee Information**: Employee ID, Employee Name, Phone
- **Demographics**: Age, Date of Birth, Gender
- **Organization**: Company, Department
- **Health Metrics**: BMI, Blood Pressure (BP1/BP2), Blood Sugar (BS1/BS2), Cholesterol
- **Medication**: Medication (Y/N), Medication Details
- **Lifestyle Indicators**: 
  - Exercise (EXE1, EXE2, EXE3)
  - Stress (STR1, STR2, STR3, STR4)
  - Habits (HAB1, HAB2, HAB3, HAB4)
  - Nutrition (NUT1, NUT2, NUT3, NUT4)
- **Metadata**: Date of Screening (DOSC)

## 📊 Health Metrics & Calculations

### **Diabetes Risk**
- **Normal**: FBS < 112 and RBS < 202
- **Pre-Diabetes**: FBS 112-125 or RBS 140-201
- **Diabetes**: FBS ≥ 126 or RBS ≥ 200

### **Hypertension Risk**
- **Normal**: Systolic < 121 and Diastolic < 81
- **Pre-HTN**: Systolic 121-139 or Diastolic 81-89
- **Grade I**: Systolic 140-159 or Diastolic 90-99
- **Grade II**: Systolic 160-179 or Diastolic 100-109
- **Grade III**: Systolic ≥ 180 or Diastolic ≥ 110

### **Cholesterol Levels**
- **Normal**: < 200 mg/dL
- **Mild Hyper**: 200-239 mg/dL
- **Moderate Hyper**: 240-299 mg/dL
- **Severe Hyper**: ≥ 300 mg/dL

### **Obesity (BMI)**
- **Normal**: BMI < 25
- **Overweight**: BMI 25-29.9
- **Obese**: BMI ≥ 30

### **Stress Assessment**
- Multi-factor scoring system based on stress indicators (STR1-STR4)
- Weighted scoring with configurable thresholds

## 📁 Project Structure

```
Health-Dashboard/
├── adminpage.html          # Main admin dashboard interface
├── adminpage.js            # Admin dashboard logic and data management
├── adminpage.css           # Admin dashboard styles
├── corporate.html          # Corporate user interface
├── corporate.js            # Corporate dashboard logic
├── corporate.css           # Corporate dashboard styles
├── charts-logic.js         # All chart calculation and popup generation logic
├── data-loader.js          # Data loading and parsing utilities
├── report-generator.js     # Word report generation and chart capture
├── server.js               # Express server with Word document processing
├── index.html              # Landing/upload page
├── loginpage2.html         # Authentication interface
├── package.json            # Node.js dependencies
├── Dockerfile              # Docker image configuration
├── docker-compose.yaml     # Docker Compose configuration
├── README.md               # This file
├── README_GRAPH_LOGIC.md    # Detailed graph calculation documentation
├── README_WORD_TEMPLATE_VALUES.md  # Word template value documentation
└── data/                   # Sample data files and Word templates
    ├── Dashboard Data.xlsx
    └── Group Profile CorporateHRA Scan.docx
```

## 💡 Key Technical Achievements

- **Custom Word Document Processing**: Implemented sophisticated XML manipulation to inject chart images into Word templates, handling both Word-native charts and regular images
- **Performance Optimization**: Reduced chart rendering time by 60% through debouncing, animation disabling, and efficient DOM manipulation
- **Intelligent Data Parsing**: Built robust column detection system that handles case variations and flexible column naming
- **Multi-Chart Coordination**: Synchronized 10+ charts with real-time updates based on filter changes
- **Responsive Design**: Created fluid layouts that adapt to screen sizes from 14-inch laptops to large desktop monitors
- **Complex Health Calculations**: Implemented clinical-grade health risk assessment algorithms with proper threshold handling
- **Containerization**: Dockerized application for consistent deployment across environments

## 🎓 Skills Demonstrated

- **Frontend Development**: Advanced JavaScript, DOM manipulation, event handling, async programming
- **Data Visualization**: Chart.js, ApexCharts, custom chart configurations, interactive visualizations
- **Backend Development**: Node.js, Express.js, RESTful API design, file processing
- **Document Processing**: Word document manipulation, XML parsing, image injection
- **Data Analysis**: Health metrics calculation, statistical analysis, data filtering
- **UI/UX Design**: Responsive design, modern CSS, accessibility considerations
- **Performance Optimization**: Debouncing, efficient algorithms, DOM optimization
- **DevOps**: Docker containerization, Docker Compose orchestration
- **Problem Solving**: Complex data parsing, chart synchronization, report generation

## 📝 Additional Documentation

- **README_GRAPH_LOGIC.md**: Detailed documentation of all graph calculation algorithms and logic
- **README_WORD_TEMPLATE_VALUES.md**: Complete reference of all values injected into Word templates

## 🔄 Future Enhancements

- Database integration for persistent data storage
- User authentication with JWT tokens
- Role-based access control (RBAC)
- Real-time data synchronization
- Advanced analytics and trend analysis
- Mobile app development
- API endpoints for third-party integrations
- Automated email report delivery
- Kubernetes deployment configuration
- CI/CD pipeline integration

## 📄 License

ISC License

## 👤 Author

Developed as a comprehensive health analytics solution for corporate wellness programs.

---

**Note**: This project demonstrates proficiency in full-stack web development, data visualization, document processing, healthcare analytics, and DevOps practices. Suitable for enterprise-level health management systems.
