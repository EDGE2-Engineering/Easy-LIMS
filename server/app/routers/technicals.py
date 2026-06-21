from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from typing import List
from ..database import get_db
from ..models.generated import Technicals
from ..schemas.generated import TechnicalsCreate, TechnicalsResponse

router = APIRouter(prefix='/technicals', tags=['technicals'])

@router.get('/', response_model=List[TechnicalsResponse])
def get_all(request: Request, skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    query = db.query(Technicals)
    for key, value in request.query_params.items():
        if key in ['skip', 'limit', 'order_by', 'order_dir']: continue
        if key.startswith('eq_'):
            field = key[3:]
            if hasattr(Technicals, field):
                query = query.filter(getattr(Technicals, field) == value)
        elif key.startswith('in_'):
            field = key[3:]
            if hasattr(Technicals, field):
                query = query.filter(getattr(Technicals, field).in_(value.split(',')))
    order_by = request.query_params.get('order_by')
    order_dir = request.query_params.get('order_dir', 'asc')
    if order_by and hasattr(Technicals, order_by):
        if order_dir == 'desc':
            query = query.order_by(getattr(Technicals, order_by).desc())
        else:
            query = query.order_by(getattr(Technicals, order_by).asc())
    return query.offset(skip).limit(limit).all()

@router.get('/{record_id}', response_model=TechnicalsResponse)
def get_one(record_id: str, db: Session = Depends(get_db)):
    record = db.query(Technicals).filter(Technicals.id == record_id).first()
    if not record:
        raise HTTPException(status_code=404, detail='Not found')
    return record

@router.post('/', response_model=TechnicalsResponse)
def create(data: TechnicalsCreate, db: Session = Depends(get_db)):
    new_record = Technicals(**data.model_dump(exclude_unset=True))
    db.add(new_record)
    db.commit()
    db.refresh(new_record)
    return new_record

@router.put('/{record_id}', response_model=TechnicalsResponse)
def update(record_id: str, data: TechnicalsCreate, db: Session = Depends(get_db)):
    record = db.query(Technicals).filter(Technicals.id == record_id).first()
    if not record:
        raise HTTPException(status_code=404, detail='Not found')
    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(record, key, value)
    db.commit()
    db.refresh(record)
    return record

@router.delete('/{record_id}')
def delete(record_id: str, db: Session = Depends(get_db)):
    record = db.query(Technicals).filter(Technicals.id == record_id).first()
    if not record:
        raise HTTPException(status_code=404, detail='Not found')
    db.delete(record)
    db.commit()
    return {'detail': 'Deleted'}
