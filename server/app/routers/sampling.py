from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from typing import List
from ..database import get_db
from ..models.generated import Sampling
from ..schemas.generated import SamplingCreate, SamplingResponse

router = APIRouter(prefix='/sampling', tags=['sampling'])

@router.get('/', response_model=List[SamplingResponse])
def get_all(request: Request, skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    query = db.query(Sampling)
    for key, value in request.query_params.items():
        if key in ['skip', 'limit', 'order_by', 'order_dir']: continue
        if key.startswith('eq_'):
            field = key[3:]
            if hasattr(Sampling, field):
                query = query.filter(getattr(Sampling, field) == value)
        elif key.startswith('in_'):
            field = key[3:]
            if hasattr(Sampling, field):
                query = query.filter(getattr(Sampling, field).in_(value.split(',')))
    order_by = request.query_params.get('order_by')
    order_dir = request.query_params.get('order_dir', 'asc')
    if order_by and hasattr(Sampling, order_by):
        if order_dir == 'desc':
            query = query.order_by(getattr(Sampling, order_by).desc())
        else:
            query = query.order_by(getattr(Sampling, order_by).asc())
    return query.offset(skip).limit(limit).all()

@router.get('/{record_id}', response_model=SamplingResponse)
def get_one(record_id: str, db: Session = Depends(get_db)):
    record = db.query(Sampling).filter(Sampling.id == record_id).first()
    if not record:
        raise HTTPException(status_code=404, detail='Not found')
    return record

@router.post('/', response_model=SamplingResponse)
def create(data: SamplingCreate, db: Session = Depends(get_db)):
    new_record = Sampling(**data.model_dump(exclude_unset=True))
    db.add(new_record)
    db.commit()
    db.refresh(new_record)
    return new_record

@router.put('/{record_id}', response_model=SamplingResponse)
def update(record_id: str, data: SamplingCreate, db: Session = Depends(get_db)):
    record = db.query(Sampling).filter(Sampling.id == record_id).first()
    if not record:
        raise HTTPException(status_code=404, detail='Not found')
    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(record, key, value)
    db.commit()
    db.refresh(record)
    return record

@router.delete('/{record_id}')
def delete(record_id: str, db: Session = Depends(get_db)):
    record = db.query(Sampling).filter(Sampling.id == record_id).first()
    if not record:
        raise HTTPException(status_code=404, detail='Not found')
    db.delete(record)
    db.commit()
    return {'detail': 'Deleted'}
