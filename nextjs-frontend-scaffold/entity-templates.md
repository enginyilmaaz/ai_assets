# Entity Templates Reference

Templates for creating CRUD entity modules. Replace `{{Entity}}`, `{{entity}}`, `{{Entities}}`, `{{entities}}`, `{{module}}` with actual values.

## 1. Page Wrapper — `src/pages/{{module}}/{{entities}}/index.tsx`

```tsx
import {{Entity}}Layout from 'src/views/pages/{{module}}/{{Entity}}Layout';
// If full ACL:
// import { AclAction, AclPermission } from 'src/constants/acl';

const {{Entity}}Page = () => <{{Entity}}Layout />;

// If full ACL:
// {{Entity}}Page.acl = { subject: AclPermission.{{Entity}}, action: AclAction.VIEW };

export default {{Entity}}Page;
```

## 2. Detail Page — `src/pages/{{module}}/{{entities}}/details/[id].tsx`

```tsx
import { useRouter } from 'next/router';
import { useCallback, useEffect, useState } from 'react';
import { Box, Card, Typography, CircularProgress } from '@mui/material';
import { get{{Entity}}ById } from 'src/services/{{module}}/{{entity}}';

const {{Entity}}DetailPage = () => {
  const router = useRouter();
  const id = typeof router.query.id === 'string' ? router.query.id : router.query.id?.[0];
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const fetchDetail = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const res = await get{{Entity}}ById(id);
      setData(res?.data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [id]);

  useEffect(() => { if (id) fetchDetail(); }, [id, fetchDetail]);

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 10 }}><CircularProgress /></Box>;
  if (!data) return <Typography sx={{ mt: 4, textAlign: 'center' }}>Not found</Typography>;

  return (
    <Card sx={{ p: 3 }}>
      <Typography variant="h5" sx={{ mb: 2 }}>{data.name}</Typography>
      <Typography variant="body2" color="text.secondary">Status: {data.status}</Typography>
      <Typography variant="body2" color="text.secondary">Created: {data.createdAt}</Typography>
    </Card>
  );
};

export default {{Entity}}DetailPage;
```

## 3. Layout Component — `src/views/pages/{{module}}/{{Entity}}Layout.tsx`

```tsx
import { useState } from 'react';
import { useRouter } from 'next/router';
import { useQuery } from '@tanstack/react-query';
import {
  Box, Card, Grid, Button, Typography, TextField, InputAdornment, IconButton,
} from '@mui/material';
import { GridColDef, GridSortModel } from '@mui/x-data-grid';
import SearchIcon from '@mui/icons-material/Search';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import GridTable from 'src/@core/components/data-grid';
import OptionsMenu from 'src/@core/components/option-menu';
import { DialogConfirm } from 'src/@core/components/dialog-confirm';
import { useSnackbar } from 'src/context/SnackbarContext';
import { getAll{{Entities}}, delete{{Entity}} } from 'src/services/{{module}}/{{entity}}';
import { ITEM_PER_PAGE } from 'src/constants/constant';
import Add{{Entity}}Modal from './components/Add{{Entity}}';
// If full ACL:
// import { useAppAbility } from 'src/hooks/useAppAbility';
// import { AclAction, AclPermission } from 'src/constants/acl';

const {{Entity}}Layout = () => {
  const router = useRouter();
  const { showSnackbar } = useSnackbar();
  // If full: const ability = useAppAbility();

  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(ITEM_PER_PAGE);
  const [keyword, setKeyword] = useState('');
  const [sortBy, setSortBy] = useState<GridSortModel>([{ field: 'updatedAt', sort: 'desc' }]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editData, setEditData] = useState<any>(null);
  const [deleteModal, setDeleteModal] = useState<{ show: boolean; id?: string; name?: string }>({ show: false });

  const { data, isFetching, refetch } = useQuery({
    queryKey: ['{{entities}}', page, perPage, keyword, sortBy],
    queryFn: () =>
      getAll{{Entities}}({
        page,
        limit: perPage,
        keyword,
        sortBy: (sortBy?.[0]?.sort?.toUpperCase() as 'ASC' | 'DESC') || 'DESC',
        orderBy: sortBy?.[0]?.field || 'updatedAt',
      }),
    staleTime: 0,
    refetchOnMount: 'always',
  });

  const handleDelete = async () => {
    if (!deleteModal.id) return;
    try {
      await delete{{Entity}}(deleteModal.id);
      showSnackbar('Deleted successfully', 'success');
      refetch();
    } catch (error: any) {
      showSnackbar(error?.response?.data?.error || 'Delete failed', 'error');
    }
  };

  const handleEdit = (row: any) => {
    setEditData(row);
    setShowAddModal(true);
  };

  const columns: GridColDef[] = [
    {
      field: 'name',
      headerName: 'Name',
      flex: 1,
      minWidth: 200,
      renderCell: ({ row }) => (
        <Typography
          sx={{ cursor: 'pointer', '&:hover': { color: 'primary.main' } }}
          onClick={() => router.push(`/{{module}}/{{entities}}/details/${row.id}`)}
        >
          {row.name}
        </Typography>
      ),
    },
    {
      field: 'status',
      headerName: 'Status',
      flex: 0.5,
      minWidth: 120,
    },
    {
      field: 'createdAt',
      headerName: 'Created',
      flex: 0.5,
      minWidth: 150,
    },
    {
      field: 'actions',
      headerName: '',
      width: 80,
      sortable: false,
      renderCell: ({ row }) => (
        <OptionsMenu
          options={[
            {
              text: 'Edit',
              icon: <EditIcon fontSize="small" sx={{ mr: 2 }} />,
              menuItemProps: { onClick: () => handleEdit(row) },
            },
            {
              text: 'Delete',
              icon: <DeleteIcon fontSize="small" sx={{ mr: 2, color: 'error.main' }} />,
              menuItemProps: {
                onClick: () => setDeleteModal({ show: true, id: row.id, name: row.name }),
                sx: { color: 'error.main' },
              },
            },
          ]}
        />
      ),
    },
  ];

  return (
    <>
      <Card sx={{ p: 3 }}>
        <Grid container justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
          <Grid item>
            <Typography variant="h5">{{Entities}}</Typography>
          </Grid>
          <Grid item sx={{ display: 'flex', gap: 2 }}>
            <TextField
              size="small"
              placeholder="Search..."
              value={keyword}
              onChange={(e) => { setKeyword(e.target.value); setPage(1); }}
              InputProps={{
                startAdornment: <InputAdornment position="start"><SearchIcon /></InputAdornment>,
              }}
            />
            <Button variant="contained" startIcon={<AddIcon />} onClick={() => { setEditData(null); setShowAddModal(true); }}>
              Add {{Entity}}
            </Button>
          </Grid>
        </Grid>

        <GridTable
          data={data?.rows || []}
          columns={columns}
          rowCount={data?.count || 0}
          loading={isFetching}
          page={page}
          setCurrentPage={setPage}
          itemPerPage={perPage}
          setItemPerPage={setPerPage}
          setQueryOptions={setSortBy}
        />
      </Card>

      <Add{{Entity}}Modal
        open={showAddModal}
        onClose={() => { setShowAddModal(false); setEditData(null); }}
        editData={editData}
        onSuccess={() => refetch()}
      />

      <DialogConfirm
        show={deleteModal.show}
        setShow={(v) => setDeleteModal({ ...deleteModal, show: v })}
        title={`Delete ${deleteModal.name || '{{entity}}'}?`}
        contentBody="This action cannot be undone."
        onConfirm={handleDelete}
        confirmText="Delete"
        type="warning"
        confirmCode={false}
      />
    </>
  );
};

export default {{Entity}}Layout;
```

## 4. Add/Edit Modal — `src/views/pages/{{module}}/components/Add{{Entity}}.tsx`

```tsx
import { FC, useState, useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Dialog, DialogContent, DialogActions, Button, Grid, Typography } from '@mui/material';
import { LoadingButton } from '@mui/lab';
import CustomTextField from 'src/@core/components/mui/text-field';
import CustomCloseButton from 'src/@core/components/custom-close-button';
import { useSnackbar } from 'src/context/SnackbarContext';
import { create{{Entity}}, update{{Entity}} } from 'src/services/{{module}}/{{entity}}';

interface Props {
  open: boolean;
  onClose: () => void;
  editData?: any;
  onSuccess?: () => void;
}

type FormValues = {
  name: string;
  // Add entity fields here
};

const Add{{Entity}}Modal: FC<Props> = ({ open, onClose, editData, onSuccess }) => {
  const { showSnackbar } = useSnackbar();
  const [submitting, setSubmitting] = useState(false);
  const isEdit = !!editData?.id;

  const { handleSubmit, control, reset } = useForm<FormValues>({
    defaultValues: { name: '' },
    mode: 'onChange',
  });

  useEffect(() => {
    if (open && editData) {
      reset({ name: editData.name || '' });
    } else if (open) {
      reset({ name: '' });
    }
  }, [open, editData, reset]);

  const onSubmit = async (data: FormValues) => {
    setSubmitting(true);
    try {
      if (isEdit) {
        await update{{Entity}}(data, editData.id);
        showSnackbar('Updated successfully', 'success');
      } else {
        await create{{Entity}}(data);
        showSnackbar('Created successfully', 'success');
      }
      onSuccess?.();
      onClose();
    } catch (error: any) {
      showSnackbar(error?.response?.data?.error || 'Error', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog fullWidth open={open} maxWidth="sm" onClose={onClose}
      sx={{ '& .MuiDialog-paper': { overflow: 'visible' } }}>
      <DialogContent sx={{ pt: 6, pb: 4, px: 3 }}>
        <CustomCloseButton onClick={onClose} />
        <Typography variant="h5" mb={4} textAlign="center">
          {isEdit ? 'Edit' : 'Add'} {{Entity}}
        </Typography>
        <form onSubmit={handleSubmit(onSubmit)} id="entity-form">
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Controller
                control={control}
                name="name"
                rules={{ required: 'Name is required' }}
                render={({ field, fieldState: { error } }) => (
                  <CustomTextField
                    {...field}
                    fullWidth
                    label={<>Name <span style={{ color: 'red' }}>*</span></>}
                    error={!!error}
                    helperText={error?.message}
                  />
                )}
              />
            </Grid>
            {/* Add more fields here */}
          </Grid>
        </form>
      </DialogContent>
      <DialogActions sx={{ px: 4, pb: 3 }}>
        <Button variant="outlined" onClick={onClose}>Cancel</Button>
        <LoadingButton loading={submitting} variant="contained" form="entity-form" type="submit">
          {isEdit ? 'Update' : 'Save'}
        </LoadingButton>
      </DialogActions>
    </Dialog>
  );
};

export default Add{{Entity}}Modal;
```

## 5. API Service — `src/services/{{module}}/{{entity}}.ts`

```typescript
import Api from 'src/configs/api';
import { FetchParamsType } from 'src/types/apps/{{entity}}Type';

export const create{{Entity}} = async (params: any) => {
  const response = await Api.post('/v1/{{module}}/{{entities}}/create{{entity}}', { data: params, headers: null });
  return response?.data;
};

export const update{{Entity}} = async (params: any, id: string) => {
  const response = await Api.put(`/v1/{{module}}/{{entities}}/update{{entity}}/${id}`, { data: params, headers: null });
  return response?.data;
};

export const getAll{{Entities}} = async (params: FetchParamsType) => {
  const response = await Api.get('/v1/{{module}}/{{entities}}/getall{{entities}}', { data: null, headers: null }, params);
  return response?.data?.data;
};

export const get{{Entity}}ById = async (id: string) => {
  const response = await Api.get(`/v1/{{module}}/{{entities}}/get{{entity}}byid/${id}`, { data: null, headers: null });
  return response?.data;
};

export const delete{{Entity}} = (id: string) =>
  Api.delete(`/v1/{{module}}/{{entities}}/delete{{entity}}/${id}`, { data: { id }, headers: null }).then((r) => r?.data);

export const bulkDelete{{Entities}} = async (ids: string[]) => {
  const response = await Api.delete(`/v1/{{module}}/{{entities}}/bulkdelete{{entities}}`, { data: { ids }, headers: null });
  return response?.data;
};

export const getAll{{Entities}}ForDropdown = async () => {
  const response = await Api.get('/v1/{{module}}/{{entities}}/getall{{entities}}fordropdown', { data: null, headers: null });
  return response?.data;
};
```

## 6. Types — `src/types/apps/{{entity}}Type.ts`

```typescript
export type FetchParamsType = {
  keyword?: string;
  page?: number;
  limit?: number;
  sortBy?: 'ASC' | 'DESC';
  orderBy?: string;
  filters?: string;
};

export type {{Entity}}Type = {
  id?: string;
  name: string;
  status?: string;
  createdAt?: string;
  updatedAt?: string;
};
```

## Checklist for Each Entity

When creating a new entity, create these files:
1. `src/pages/{{module}}/{{entities}}/index.tsx` — Page wrapper
2. `src/views/pages/{{module}}/{{Entity}}Layout.tsx` — List layout with GridTable
3. `src/views/pages/{{module}}/components/Add{{Entity}}.tsx` — Add/Edit modal
4. `src/services/{{module}}/{{entity}}.ts` — API service
5. `src/types/apps/{{entity}}Type.ts` — Types
6. (Optional) `src/pages/{{module}}/{{entities}}/details/[id].tsx` — Detail page
7. If full ACL: Add permission to `src/constants/acl.ts` AclPermission enum
8. Add route to `src/constants/PrivateRoutes.ts`
