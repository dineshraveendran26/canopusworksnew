# 🚀 Quick Start Guide - Canopus Works

## **The Directory Problem (Why You Get Stuck)**

Your project structure is:
```
Canopus-works (V2)/
└── Canopus-works/          ← package.json is HERE
    ├── package.json
    ├── app/
    ├── components/
    └── ...
```

**❌ WRONG:** Running commands from `Canopus-works (V2)/`
**✅ RIGHT:** Running commands from `Canopus-works (V2)/Canopus-works/`

## **Quick Commands (Always Use These)**

### **Option 1: Use the Script (Recommended)**
```bash
./start-app.sh
```

### **Option 2: Manual Commands**
```bash
# Always start from the inner Canopus-works directory
cd Canopus-works
pnpm dev
```

### **Option 3: Full Path (Never Wrong)**
```bash
cd "/Users/dineshraveendran/Documents/Thara/Canopus-works (V2)/Canopus-works"
pnpm dev
```

## **Why You Get "Stuck"**

1. **Directory Confusion**: Running `pnpm dev` from wrong directory
2. **Background Processes**: Multiple failed processes running silently
3. **Environment Issues**: Missing or incorrect `.env.local` file

## **Troubleshooting**

### **If you get "No package.json found":**
```bash
# You're in the wrong directory
pwd
# Should show: .../Canopus-works (V2)/Canopus-works
# NOT: .../Canopus-works (V2)
```

### **If the app won't start:**
```bash
# Kill all background processes
pkill -f "next dev"
pkill -f "pnpm dev"

# Then start fresh
./start-app.sh
```

### **If build fails:**
```bash
# Clean and rebuild
rm -rf .next
pnpm build
```

## **Pro Tips**

- **Always use `./start-app.sh`** - it handles everything automatically
- **Check your directory** with `pwd` before running commands
- **Look for the `package.json`** file to confirm you're in the right place
- **Use `Ctrl+C`** to stop the dev server cleanly
