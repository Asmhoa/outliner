from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from outliner_api_server.routers import (
    pages_router,
    blocks_router,
    workspaces_router,
    databases_router,
    utils_router,
)


# @asynccontextmanager
# async def lifespan(app: FastAPI):
#     # Startup
#     sys_db = SystemDatabase()

#     # Store the system database in app state
#     app.state.sys_db = sys_db
#     yield
#     # Shutdown
#     if hasattr(app.state, "sys_db"):
#         app.state.sys_db.close_conn()


app = FastAPI()

origins = [
    "http://localhost:5173",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include all the routers
app.include_router(pages_router.router)
app.include_router(blocks_router.router)
app.include_router(workspaces_router.router)
app.include_router(databases_router.router)
app.include_router(utils_router.router)
