from fastapi import FastAPI, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
import uvicorn
import os  # Import os module

app = FastAPI()

# Mount static files directory correctly
app.mount("/static", StaticFiles(directory="static"), name="static")

@app.get("/")
async def read_root():
    try:
        # Update the path to index.html in the templates directory
        file_path = os.path.join(os.path.dirname(__file__), "templates", "index.html")
        return FileResponse(file_path)
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="index.html not found")

if __name__ == "__main__":
    uvicorn.run("app:app", host="0.0.0.0", port=8000, reload=True)
