from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from typing import List
from ..database import get_db
from ..models.generated import ClientTestPrices
from ..schemas.generated import ClientTestPricesCreate, ClientTestPricesResponse

router = APIRouter(prefix='/client-test-prices', tags=['client_test_prices'])

@router.get('/', response_model=List[ClientTestPricesResponse])
def get_all(request: Request, skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    query = db.query(ClientTestPrices)
    for key, value in request.query_params.items():
        if key in ['skip', 'limit', 'order_by', 'order_dir']: continue
        if key.startswith('eq_'):
            field = key[3:]
            if hasattr(ClientTestPrices, field):
                query = query.filter(getattr(ClientTestPrices, field) == value)
        elif key.startswith('in_'):
            field = key[3:]
            if hasattr(ClientTestPrices, field):
                query = query.filter(getattr(ClientTestPrices, field).in_(value.split(',')))
    order_by = request.query_params.get('order_by')
    order_dir = request.query_params.get('order_dir', 'asc')
    if order_by and hasattr(ClientTestPrices, order_by):
        if order_dir == 'desc':
            query = query.order_by(getattr(ClientTestPrices, order_by).desc())
        else:
            query = query.order_by(getattr(ClientTestPrices, order_by).asc())
    return query.offset(skip).limit(limit).all()

@router.get('/{record_id}', response_model=ClientTestPricesResponse)
def get_one(record_id: str, db: Session = Depends(get_db)):
    record = db.query(ClientTestPrices).filter(ClientTestPrices.id == record_id).first()
    if not record:
        raise HTTPException(status_code=404, detail='Not found')
    return record

@router.post('/', response_model=ClientTestPricesResponse)
def create(data: ClientTestPricesCreate, db: Session = Depends(get_db)):
    new_record = ClientTestPrices(**data.model_dump(exclude_unset=True))
    db.add(new_record)
    db.commit()
    db.refresh(new_record)
    return new_record

@router.put('/{record_id}', response_model=ClientTestPricesResponse)
def update(record_id: str, data: ClientTestPricesCreate, db: Session = Depends(get_db)):
    record = db.query(ClientTestPrices).filter(ClientTestPrices.id == record_id).first()
    if not record:
        raise HTTPException(status_code=404, detail='Not found')
    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(record, key, value)
    db.commit()
    db.refresh(record)
    return record

@router.delete('/{record_id}')
def delete(record_id: str, db: Session = Depends(get_db)):
    record = db.query(ClientTestPrices).filter(ClientTestPrices.id == record_id).first()
    if not record:
        raise HTTPException(status_code=404, detail='Not found')
    db.delete(record)
    db.commit()
    return {'detail': 'Deleted'}
