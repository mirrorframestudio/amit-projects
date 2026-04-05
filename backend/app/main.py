from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .routers import campaigns, debug, meta, shopify, pnl, product_costs, manual_expenses

app = FastAPI(title="Ads Dashboard API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(campaigns.router)
app.include_router(debug.router)
app.include_router(meta.router)
app.include_router(shopify.router)
app.include_router(pnl.router)
app.include_router(product_costs.router)
app.include_router(manual_expenses.router)


@app.get("/")
def root():
    return {"message": "Ads Dashboard API is running"}


@app.get("/health")
def health():
    return {"status": "ok"}
